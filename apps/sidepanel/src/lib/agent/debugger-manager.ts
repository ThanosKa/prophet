const CDP_VERSION = '1.3'
const AUTO_DETACH_TIMEOUT_MS = 30000

type PendingCommand = {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
}

class DebuggerManagerClass {
  private attachedTabs = new Set<number>()
  private autoDetachTimers = new Map<number, ReturnType<typeof setTimeout>>()
  private pendingCommands = new Map<number, Set<PendingCommand>>()
  private attachLocks = new Map<number, Promise<void>>()
  private initialized = false

  constructor() {
    this.setupListeners()
  }

  private setupListeners(): void {
    if (this.initialized) return
    this.initialized = true

    chrome.debugger.onDetach.addListener((source, reason) => {
      const tabId = source.tabId
      if (tabId === undefined) return

      console.log(`[DebuggerManager] Detached from tab ${tabId}, reason: ${reason}`)
      this.cleanup(tabId)
    })

    chrome.tabs.onRemoved.addListener((tabId) => {
      if (this.attachedTabs.has(tabId)) {
        console.log(`[DebuggerManager] Tab ${tabId} closed, cleaning up`)
        this.cleanup(tabId)
      }
    })
  }

  private cleanup(tabId: number): void {
    this.attachedTabs.delete(tabId)

    const timer = this.autoDetachTimers.get(tabId)
    if (timer) {
      clearTimeout(timer)
      this.autoDetachTimers.delete(tabId)
    }

    const pending = this.pendingCommands.get(tabId)
    if (pending) {
      pending.forEach((cmd) => {
        cmd.reject(new Error('Debugger detached'))
      })
      this.pendingCommands.delete(tabId)
    }

    this.attachLocks.delete(tabId)
  }

  async attach(tabId: number): Promise<void> {
    if (this.attachedTabs.has(tabId)) {
      this.touchAutoDetach(tabId)
      return
    }

    const existingLock = this.attachLocks.get(tabId)
    if (existingLock) {
      await existingLock
      return
    }

    const attachPromise = this.doAttach(tabId)
    this.attachLocks.set(tabId, attachPromise)

    try {
      await attachPromise
    } finally {
      this.attachLocks.delete(tabId)
    }
  }

  private async doAttach(tabId: number): Promise<void> {
    try {
      await chrome.debugger.attach({ tabId }, CDP_VERSION)
      this.attachedTabs.add(tabId)
      this.pendingCommands.set(tabId, new Set())
      this.scheduleAutoDetach(tabId)
      console.log(`[DebuggerManager] Attached to tab ${tabId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('Another debugger is already attached')) {
        console.warn(`[DebuggerManager] Debugger already attached to tab ${tabId}, proceeding`)
        this.attachedTabs.add(tabId)
        this.pendingCommands.set(tabId, new Set())
        this.scheduleAutoDetach(tabId)
      } else {
        throw error
      }
    }
  }

  async detach(tabId: number): Promise<void> {
    if (!this.attachedTabs.has(tabId)) {
      return
    }

    try {
      await chrome.debugger.detach({ tabId })
      console.log(`[DebuggerManager] Manually detached from tab ${tabId}`)
    } catch (error) {
      console.warn(`[DebuggerManager] Error detaching from tab ${tabId}:`, error)
    } finally {
      this.cleanup(tabId)
    }
  }

  isAttached(tabId: number): boolean {
    return this.attachedTabs.has(tabId)
  }

  touchAutoDetach(tabId: number): void {
    const existingTimer = this.autoDetachTimers.get(tabId)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }
    this.scheduleAutoDetach(tabId)
  }

  private scheduleAutoDetach(tabId: number): void {
    const timer = setTimeout(() => {
      if (this.attachedTabs.has(tabId)) {
        console.log(`[DebuggerManager] Auto-detaching from tab ${tabId} due to inactivity`)
        this.detach(tabId)
      }
    }, AUTO_DETACH_TIMEOUT_MS)

    this.autoDetachTimers.set(tabId, timer)
  }

  registerPendingCommand(tabId: number, command: PendingCommand): void {
    const pending = this.pendingCommands.get(tabId)
    if (pending) {
      pending.add(command)
    }
  }

  unregisterPendingCommand(tabId: number, command: PendingCommand): void {
    const pending = this.pendingCommands.get(tabId)
    if (pending) {
      pending.delete(command)
    }
  }

  async detachAll(): Promise<void> {
    const tabIds = Array.from(this.attachedTabs)
    await Promise.all(tabIds.map((tabId) => this.detach(tabId)))
  }

  handleTabRemoved(tabId: number): void {
    if (this.attachedTabs.has(tabId)) {
      console.log(`[DebuggerManager] Tab ${tabId} removed externally, cleaning up`)
      this.cleanup(tabId)
    }
  }
}

export const debuggerManager = new DebuggerManagerClass()

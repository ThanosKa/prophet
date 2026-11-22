import { openTabAndWaitForLoad } from './tab-tool'
import { snapshotManager } from '../snapshot-manager'
import { debuggerManager } from '../debugger-manager'
import { type ToolExecutionResult } from '../types'

interface TabInfo {
    id: number
    title: string
    url: string
    active: boolean
    windowId: number
    index: number
}

export async function listTabs(): Promise<ToolExecutionResult> {
    const startTime = Date.now()

    try {
        const tabs = await chrome.tabs.query({})

        const userTabs = tabs.filter((tab) => {
            if (!tab.url) return false
            if (tab.url.startsWith('chrome://')) return false
            if (tab.url.startsWith('chrome-extension://')) return false
            if (tab.url.startsWith('about:')) return false
            return true
        })

        const tabInfos: TabInfo[] = userTabs.flatMap((tab) =>
            tab.id === undefined
                ? []
                : [
                      {
                          id: tab.id,
                          title: tab.title || 'Untitled',
                          url: tab.url || '',
                          active: tab.active || false,
                          windowId: tab.windowId,
                          index: tab.index,
                      },
                  ]
        )

        tabInfos.sort((a, b) => {
            if (a.windowId !== b.windowId) return a.windowId - b.windowId
            return a.index - b.index
        })

        const formatted = tabInfos
            .map((t, i) => `${i + 1}. [id=${t.id}] ${t.active ? '* ' : ''}${t.title}\n   ${t.url}`)
            .join('\n\n')

        return {
            success: true,
            data: `Found ${tabInfos.length} tabs:\n\n${formatted}`,
            durationMs: Date.now() - startTime,
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list tabs',
            durationMs: Date.now() - startTime,
        }
    }
}

export async function switchTab(input: { tabId: number }): Promise<ToolExecutionResult> {
    const startTime = Date.now()

    try {
        const tab = await chrome.tabs.get(input.tabId)
        if (!tab) {
            return {
                success: false,
                error: `Tab ${input.tabId} not found`,
                durationMs: Date.now() - startTime,
            }
        }

        await chrome.tabs.update(input.tabId, { active: true })

        if (tab.windowId) {
            await chrome.windows.update(tab.windowId, { focused: true })
        }

        return {
            success: true,
            data: `Switched to tab: ${tab.title || 'Untitled'}`,
            durationMs: Date.now() - startTime,
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to switch tab',
            durationMs: Date.now() - startTime,
        }
    }
}

export async function closeTab(input: { tabId: number }): Promise<ToolExecutionResult> {
    const startTime = Date.now()

    try {
        const tab = await chrome.tabs.get(input.tabId)
        if (!tab) {
            return {
                success: false,
                error: `Tab ${input.tabId} not found`,
                durationMs: Date.now() - startTime,
            }
        }

        const tabTitle = tab.title || 'Untitled'

        if (debuggerManager.isAttached(input.tabId)) {
            await debuggerManager.detach(input.tabId)
        }

        snapshotManager.clearSnapshot(input.tabId)

        await chrome.tabs.remove(input.tabId)

        return {
            success: true,
            data: `Closed tab: ${tabTitle}`,
            durationMs: Date.now() - startTime,
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to close tab',
            durationMs: Date.now() - startTime,
        }
    }
}

export async function openNewTab(input: {
    url: string
    active?: boolean
}): Promise<ToolExecutionResult> {
    const startTime = Date.now()

    try {
        let url = input.url
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`
        }

        const active = input.active ?? true

        const newTab = await openTabAndWaitForLoad({
            timeoutMs: 30000,
            open: () => chrome.tabs.create({ url, active }),
        })

        if (!newTab.id) {
            return {
                success: false,
                error: 'Failed to create new tab',
                durationMs: Date.now() - startTime,
            }
        }

        const updatedTab = await chrome.tabs.get(newTab.id)

        return {
            success: true,
            data: `Opened new tab [id=${newTab.id}]: ${updatedTab.title || url}`,
            durationMs: Date.now() - startTime,
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to open new tab',
            durationMs: Date.now() - startTime,
        }
    }
}

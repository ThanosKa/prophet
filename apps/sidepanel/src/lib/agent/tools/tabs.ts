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

/**
 * List all open browser tabs.
 * Filters out extension and chrome:// pages.
 */
export async function listTabs(): Promise<ToolExecutionResult> {
    const startTime = Date.now()

    try {
        const tabs = await chrome.tabs.query({})

        // Filter out extension pages and chrome:// URLs
        const userTabs = tabs.filter((tab) => {
            if (!tab.url) return false
            if (tab.url.startsWith('chrome://')) return false
            if (tab.url.startsWith('chrome-extension://')) return false
            if (tab.url.startsWith('about:')) return false
            return true
        })

        const tabInfos: TabInfo[] = userTabs.map((tab) => ({
            id: tab.id!,
            title: tab.title || 'Untitled',
            url: tab.url || '',
            active: tab.active || false,
            windowId: tab.windowId,
            index: tab.index,
        }))

        // Sort by window, then by index
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

/**
 * Switch to a different tab.
 * Also focuses the window containing the tab.
 */
export async function switchTab(input: { tabId: number }): Promise<ToolExecutionResult> {
    const startTime = Date.now()

    try {
        // Validate tab exists
        const tab = await chrome.tabs.get(input.tabId)
        if (!tab) {
            return {
                success: false,
                error: `Tab ${input.tabId} not found`,
                durationMs: Date.now() - startTime,
            }
        }

        // Activate the tab
        await chrome.tabs.update(input.tabId, { active: true })

        // Focus the window containing the tab
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

/**
 * Close a tab and clean up associated resources.
 * Detaches debugger and clears snapshot.
 */
export async function closeTab(input: { tabId: number }): Promise<ToolExecutionResult> {
    const startTime = Date.now()

    try {
        // Validate tab exists
        const tab = await chrome.tabs.get(input.tabId)
        if (!tab) {
            return {
                success: false,
                error: `Tab ${input.tabId} not found`,
                durationMs: Date.now() - startTime,
            }
        }

        const tabTitle = tab.title || 'Untitled'

        // Clean up debugger if attached
        if (debuggerManager.isAttached(input.tabId)) {
            await debuggerManager.detach(input.tabId)
        }

        // Clean up snapshot
        snapshotManager.clearSnapshot(input.tabId)

        // Close the tab
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

/**
 * Open a URL in a new tab.
 * Optionally switch to the new tab immediately.
 */
export async function openNewTab(input: {
    url: string
    active?: boolean
}): Promise<ToolExecutionResult> {
    const startTime = Date.now()

    try {
        let url = input.url
        // Normalize URL
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`
        }

        const active = input.active ?? true

        // Create the new tab
        const newTab = await chrome.tabs.create({ url, active })

        if (!newTab.id) {
            return {
                success: false,
                error: 'Failed to create new tab',
                durationMs: Date.now() - startTime,
            }
        }

        // Wait for the tab to finish loading
        await new Promise<void>((resolve) => {
            const listener = (
                tabId: number,
                changeInfo: chrome.tabs.TabChangeInfo
            ) => {
                if (tabId === newTab.id && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener)
                    resolve()
                }
            }
            chrome.tabs.onUpdated.addListener(listener)

            // Timeout after 30s
            setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener)
                resolve()
            }, 30000)
        })

        // Get updated tab info
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

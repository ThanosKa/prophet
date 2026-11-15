import type { ToolExecutionResult } from '../types'
import type { ToolExecutor } from './index'

export type ActiveTab = chrome.tabs.Tab & { id: number }
export type ToolOutcome = { data: unknown } | { error: string }

function isActiveTab(tab: chrome.tabs.Tab | undefined): tab is ActiveTab {
  return Boolean(tab?.id)
}

/**
 * Wrap a browser tool that acts on the active tab. The wrapper finds the tab,
 * times the call and shapes the result, so `run` says only what it does to the
 * page. With no active tab it returns 'No active tab found' without running.
 */
export function activeTabTool<Input>({
  failure,
  run,
}: {
  failure: string
  run: (args: { input: Input; tab: ActiveTab }) => Promise<ToolOutcome>
}): ToolExecutor<Input> {
  return async (input: Input): Promise<ToolExecutionResult> => {
    const startTime = Date.now()
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!isActiveTab(tab)) {
        return { success: false, error: 'No active tab found', durationMs: Date.now() - startTime }
      }
      const outcome = await run({ input, tab })
      if ('data' in outcome) {
        return { success: true, data: outcome.data, durationMs: Date.now() - startTime }
      }
      return { success: false, error: outcome.error, durationMs: Date.now() - startTime }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : failure,
        durationMs: Date.now() - startTime,
      }
    }
  }
}

/**
 * Wait for a tab to finish loading. Resolves 'complete' when the tab reports
 * status 'complete', or 'timed_out' after `timeoutMs`. The listener is removed
 * on both paths.
 */
export function waitForTabComplete({
  tabId,
  timeoutMs,
}: {
  tabId: number
  timeoutMs: number
}): Promise<'complete' | 'timed_out'> {
  return new Promise((resolve) => {
    const finish = (result: 'complete' | 'timed_out') => {
      clearTimeout(timer)
      chrome.tabs.onUpdated.removeListener(listener)
      resolve(result)
    }
    const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') finish('complete')
    }
    const timer = setTimeout(() => finish('timed_out'), timeoutMs)
    chrome.tabs.onUpdated.addListener(listener)
  })
}

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

type TabLoad = 'complete' | 'timed_out'

/**
 * One chrome.tabs.onUpdated listener for a whole wait. It is added before the
 * navigation is requested, so a load that finishes during the request is not
 * missed. Until `waitFor` is called it records each tab's status changes; then
 * it resolves on the tab's next load-complete. `waitFor` and `stop` remove it.
 */
function watchTabStatus(): {
  statusesOf: (tabId: number) => string[]
  waitFor: (args: { tabId: number; timeoutMs: number }) => Promise<TabLoad>
  stop: () => void
} {
  const seen = new Map<number, string[]>()
  let onComplete: ((tabId: number) => void) | undefined
  const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
    if (!changeInfo.status) return
    if (onComplete) {
      if (changeInfo.status === 'complete') onComplete(tabId)
      return
    }
    seen.set(tabId, [...(seen.get(tabId) ?? []), changeInfo.status])
  }
  const stop = () => chrome.tabs.onUpdated.removeListener(listener)
  chrome.tabs.onUpdated.addListener(listener)

  return {
    statusesOf: (tabId) => seen.get(tabId) ?? [],
    stop,
    waitFor: ({ tabId, timeoutMs }) =>
      new Promise((resolve) => {
        const finish = (result: TabLoad) => {
          clearTimeout(timer)
          stop()
          resolve(result)
        }
        onComplete = (updatedTabId) => {
          if (updatedTabId === tabId) finish('complete')
        }
        const timer = setTimeout(() => finish('timed_out'), timeoutMs)
      }),
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
}): Promise<TabLoad> {
  return watchTabStatus().waitFor({ tabId, timeoutMs })
}

/**
 * Request a navigation in a tab, then wait for the tab to finish loading the new
 * page. Listening starts before the request, so a load that finishes while the
 * request is in progress ends the wait at once. During the request only a load
 * that started after listening counts, so a load-complete left over from the
 * page before the request never ends it. The timeout starts once the request
 * returns, as it did before listening moved. The listener is removed on every
 * path, including a failing request, whose error is rethrown.
 */
export async function navigateAndWaitForLoad({
  tabId,
  timeoutMs,
  navigate,
}: {
  tabId: number
  timeoutMs: number
  navigate: () => Promise<unknown>
}): Promise<TabLoad> {
  const watch = watchTabStatus()
  try {
    await navigate()
  } catch (error) {
    watch.stop()
    throw error
  }
  const statuses = watch.statusesOf(tabId)
  if (statuses.includes('loading') && statuses.at(-1) === 'complete') {
    watch.stop()
    return 'complete'
  }
  return watch.waitFor({ tabId, timeoutMs })
}

/**
 * Open a tab, then wait for it to finish loading. Listening starts before the
 * tab is created, so a load that finishes while it is being created ends the
 * wait at once (a new tab has no earlier page to confuse it with). A created
 * tab without an id is returned without waiting. The listener is removed on
 * every path, including a failing `open`, whose error is rethrown.
 */
export async function openTabAndWaitForLoad({
  timeoutMs,
  open,
}: {
  timeoutMs: number
  open: () => Promise<chrome.tabs.Tab>
}): Promise<chrome.tabs.Tab> {
  const watch = watchTabStatus()
  let tab: chrome.tabs.Tab
  try {
    tab = await open()
  } catch (error) {
    watch.stop()
    throw error
  }
  if (!tab.id || watch.statusesOf(tab.id).at(-1) === 'complete') {
    watch.stop()
    return tab
  }
  await watch.waitFor({ tabId: tab.id, timeoutMs })
  return tab
}

/**
 * Wait for a tab's current load to finish, unless it has already. Listening
 * starts before the tab's status is read, so a load that finishes while it is
 * being read is not missed. The listener is removed on every path, including a
 * failing read, whose error is rethrown.
 */
export async function waitForLoadUnlessComplete({
  tabId,
  timeoutMs,
}: {
  tabId: number
  timeoutMs: number
}): Promise<'already_loaded' | TabLoad> {
  const watch = watchTabStatus()
  let status: chrome.tabs.Tab['status']
  try {
    status = (await chrome.tabs.get(tabId)).status
  } catch (error) {
    watch.stop()
    throw error
  }
  if (status === 'complete') {
    watch.stop()
    return 'already_loaded'
  }
  if (watch.statusesOf(tabId).at(-1) === 'complete') {
    watch.stop()
    return 'complete'
  }
  return watch.waitFor({ tabId, timeoutMs })
}

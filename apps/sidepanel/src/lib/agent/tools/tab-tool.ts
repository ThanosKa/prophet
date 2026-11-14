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

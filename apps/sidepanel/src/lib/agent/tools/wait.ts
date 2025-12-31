import { cdpCommander, type EvaluateResult } from '../cdp-commander'
import { type ToolExecutionResult } from '../types'

const MAX_TIMEOUT_MS = 30000
const DEFAULT_TIMEOUT_MS = 10000

/**
 * Wait for a CSS selector to appear in the DOM.
 */
export async function waitForSelector(input: {
    selector: string
    timeout?: number
    visible?: boolean
}): Promise<ToolExecutionResult> {
    const startTime = Date.now()
    const timeout = Math.min(input.timeout || DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS)

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!tab?.id) {
            return {
                success: false,
                error: 'No active tab found',
                durationMs: Date.now() - startTime,
            }
        }

        // Escape selector for use in template literal
        const escapedSelector = input.selector.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
        const checkVisible = input.visible ?? false

        const result = await cdpCommander.sendCommand<EvaluateResult>(
            tab.id,
            'Runtime.evaluate',
            {
                expression: `
          new Promise((resolve, reject) => {
            const checkElement = () => {
              const el = document.querySelector('${escapedSelector}');
              if (!el) return null;
              
              if (${checkVisible}) {
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return null;
                const style = window.getComputedStyle(el);
                if (style.visibility === 'hidden' || style.display === 'none') return null;
              }
              
              return el;
            };

            // Check immediately first
            if (checkElement()) {
              resolve({ found: true, immediate: true });
              return;
            }

            // Set up MutationObserver
            const observer = new MutationObserver(() => {
              if (checkElement()) {
                observer.disconnect();
                resolve({ found: true, immediate: false });
              }
            });

            observer.observe(document.body, {
              childList: true,
              subtree: true,
              attributes: true,
              attributeFilter: ['style', 'class', 'hidden']
            });

            // Timeout handler
            setTimeout(() => {
              observer.disconnect();
              reject(new Error('Timeout waiting for selector: ${escapedSelector}'));
            }, ${timeout});
          })
        `,
                awaitPromise: true,
                returnByValue: true,
            },
            timeout + 1000 // CDP timeout slightly longer than JS timeout
        )

        if (result.exceptionDetails) {
            const errorMsg = result.exceptionDetails.text || 'Timeout waiting for selector'
            return {
                success: false,
                error: errorMsg,
                durationMs: Date.now() - startTime,
            }
        }

        return {
            success: true,
            data: `Element '${input.selector}' found${input.visible ? ' and visible' : ''}`,
            durationMs: Date.now() - startTime,
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to wait for selector',
            durationMs: Date.now() - startTime,
        }
    }
}

/**
 * Wait for page navigation to complete.
 * Listens for chrome.tabs.onUpdated with status 'complete'.
 */
export async function waitForNavigation(input: {
    timeout?: number
}): Promise<ToolExecutionResult> {
    const startTime = Date.now()
    const timeout = Math.min(input.timeout || MAX_TIMEOUT_MS, MAX_TIMEOUT_MS)

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!tab?.id) {
            return {
                success: false,
                error: 'No active tab found',
                durationMs: Date.now() - startTime,
            }
        }

        const tabId = tab.id

        // Check if already complete
        const currentTab = await chrome.tabs.get(tabId)
        if (currentTab.status === 'complete') {
            return {
                success: true,
                data: 'Page already loaded',
                durationMs: Date.now() - startTime,
            }
        }

        // Wait for navigation to complete
        await new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener)
                reject(new Error('Timeout waiting for navigation'))
            }, timeout)

            const listener = (
                updatedTabId: number,
                changeInfo: chrome.tabs.TabChangeInfo
            ) => {
                if (updatedTabId === tabId && changeInfo.status === 'complete') {
                    clearTimeout(timeoutId)
                    chrome.tabs.onUpdated.removeListener(listener)
                    resolve()
                }
            }

            chrome.tabs.onUpdated.addListener(listener)
        })

        return {
            success: true,
            data: 'Navigation complete',
            durationMs: Date.now() - startTime,
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to wait for navigation',
            durationMs: Date.now() - startTime,
        }
    }
}

/**
 * Wait for a specified amount of time.
 * Useful for animations or debounced operations.
 */
export async function waitForTimeout(input: {
    ms: number
}): Promise<ToolExecutionResult> {
    const startTime = Date.now()
    const timeout = Math.min(Math.max(input.ms, 0), MAX_TIMEOUT_MS)

    await new Promise((resolve) => setTimeout(resolve, timeout))

    return {
        success: true,
        data: `Waited ${timeout}ms`,
        durationMs: Date.now() - startTime,
    }
}

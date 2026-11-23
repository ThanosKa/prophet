import { cdpCommander } from '../cdp-commander'
import { evaluateResultSchema } from '../cdp-results'
import { type ToolExecutionResult } from '../types'
import { activeTabTool, waitForLoadUnlessComplete } from './tab-tool'

const MAX_TIMEOUT_MS = 30000
const DEFAULT_TIMEOUT_MS = 10000

export const waitForSelector = activeTabTool<{
  selector: string
  timeout?: number
  visible?: boolean
}>({
  failure: 'Failed to wait for selector',
  run: async ({ input, tab }) => {
    const timeout = Math.min(input.timeout || DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS)
    const escapedSelector = input.selector.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const checkVisible = input.visible ?? false

    const result = evaluateResultSchema.parse(await cdpCommander.sendCommand(
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
      timeout + 1000,
    ))

    if (result.exceptionDetails) {
      return {
        error: result.exceptionDetails.text || 'Timeout waiting for selector',
      }
    }

    return {
      data: `Element '${input.selector}' found${input.visible ? ' and visible' : ''}`,
    }
  },
})

export const waitForNavigation = activeTabTool<{ timeout?: number }>({
  failure: 'Failed to wait for navigation',
  run: async ({ input, tab }) => {
    const timeout = Math.min(input.timeout || MAX_TIMEOUT_MS, MAX_TIMEOUT_MS)

    const outcome = await waitForLoadUnlessComplete({ tabId: tab.id, timeoutMs: timeout })
    if (outcome === 'already_loaded') {
      return { data: 'Page already loaded' }
    }
    if (outcome === 'timed_out') {
      return { error: 'Timeout waiting for navigation' }
    }
    return { data: 'Navigation complete' }
  },
})

export async function waitForTimeout(input: { ms: number }): Promise<ToolExecutionResult> {
  const startTime = Date.now()
  const timeout = Math.min(Math.max(input.ms, 0), MAX_TIMEOUT_MS)

  await new Promise((resolve) => setTimeout(resolve, timeout))

  return {
    success: true,
    data: `Waited ${timeout}ms`,
    durationMs: Date.now() - startTime,
  }
}

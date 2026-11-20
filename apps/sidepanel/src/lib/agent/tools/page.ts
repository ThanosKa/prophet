import { AGENT_SIZE_LIMITS } from '@prophet/shared'
import { cdpCommander, type EvaluateResult } from '../cdp-commander'
import { activeTabTool, navigateAndWaitForLoad } from './tab-tool'
import { type ScrollDirection, type PageContent } from '../types'

export const navigate = activeTabTool<{ url: string }>({
  failure: 'Failed to navigate',
  run: async ({ input, tab }) => {
    let url = input.url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }

    await navigateAndWaitForLoad({
      tabId: tab.id,
      timeoutMs: 30000,
      navigate: () => chrome.tabs.update(tab.id, { url }),
    })

    return { data: `Navigated to ${url}` }
  },
})

export const scrollPage = activeTabTool<{ direction: ScrollDirection; pixels?: number }>({
  failure: 'Failed to scroll',
  run: async ({ input, tab }) => {
    // Negative pixels scroll the other way. Negate the number, not the text: `-${-500}` is `--500`, a syntax error.
    const pixels = input.pixels ?? 500
    let scrollExpression: string

    switch (input.direction) {
      case 'up':
        scrollExpression = `window.scrollBy(0, ${-pixels})`
        break
      case 'down':
        scrollExpression = `window.scrollBy(0, ${pixels})`
        break
      case 'left':
        scrollExpression = `window.scrollBy(${-pixels}, 0)`
        break
      case 'right':
        scrollExpression = `window.scrollBy(${pixels}, 0)`
        break
      case 'top':
        scrollExpression = `window.scrollTo(0, 0)`
        break
      case 'bottom':
        scrollExpression = `window.scrollTo(0, document.body.scrollHeight)`
        break
      default:
        return { error: `Invalid scroll direction: ${input.direction}` }
    }

    await cdpCommander.sendCommand<EvaluateResult>(tab.id, 'Runtime.evaluate', {
      expression: scrollExpression,
      awaitPromise: false,
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    return {
      data: `Scrolled ${input.direction}${input.direction !== 'top' && input.direction !== 'bottom' ? ` by ${pixels}px` : ''}`,
    }
  },
})

export const getPageContent = activeTabTool<void>({
  failure: 'Failed to get page content',
  run: async ({ tab }) => {
    // Capped at the shared page-content limit, so one page can't swell every later Turn's prompt
    // Also filter out obvious JavaScript/CSS noise
    const result = await cdpCommander.sendCommand<EvaluateResult>(
      tab.id,
      'Runtime.evaluate',
      {
        expression: `
          (function() {
            const MAX_CONTENT_LENGTH = ${AGENT_SIZE_LIMITS.pageContentChars};
            const walker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: function(node) {
                  // Skip script and style elements
                  const parent = node.parentElement;
                  if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || parent.tagName === 'NOSCRIPT')) {
                    return NodeFilter.FILTER_REJECT;
                  }
                  return NodeFilter.FILTER_ACCEPT;
                }
              }
            );
            const textNodes = [];
            let node;
            let totalLength = 0;
            while ((node = walker.nextNode()) && totalLength < MAX_CONTENT_LENGTH) {
              const text = node.textContent.trim();
              // Filter out obvious JS/CSS noise
              if (text && text.length > 1 && !text.match(/^[]{}()[;,]+$/) && !text.startsWith('!function')) {
                textNodes.push(text);
                totalLength += text.length;
              }
            }
            return textNodes.join(' ').substring(0, MAX_CONTENT_LENGTH);
          })()
        `,
        returnByValue: true,
      }
    )

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'Failed to get page content')
    }

    const content: PageContent = {
      url: tab.url || '',
      title: tab.title || '',
      text: (result.result.value as string) || '',
    }

    return { data: `Page: ${content.title}\nURL: ${content.url}\n\nContent:\n${content.text}` }
  },
})

export const goBack = activeTabTool<void>({
  failure: 'Failed to go back',
  run: async ({ tab }) => {
    await navigateAndWaitForLoad({ tabId: tab.id, timeoutMs: 5000, navigate: () => chrome.tabs.goBack(tab.id) })

    const updatedTab = await chrome.tabs.get(tab.id)

    return { data: `Navigated back to: ${updatedTab.title || updatedTab.url}` }
  },
})

/**
 * Navigate forward in browser history.
 */
export const goForward = activeTabTool<void>({
  failure: 'Failed to go forward',
  run: async ({ tab }) => {
    await navigateAndWaitForLoad({ tabId: tab.id, timeoutMs: 5000, navigate: () => chrome.tabs.goForward(tab.id) })

    const updatedTab = await chrome.tabs.get(tab.id)

    return { data: `Navigated forward to: ${updatedTab.title || updatedTab.url}` }
  },
})

/**
 * Reload the current page.
 */
export const reloadPage = activeTabTool<void>({
  failure: 'Failed to reload page',
  run: async ({ tab }) => {
    await navigateAndWaitForLoad({ tabId: tab.id, timeoutMs: 30000, navigate: () => chrome.tabs.reload(tab.id) })

    return { data: 'Page reloaded' }
  },
})

/**
 * Get information about the current page.
 */
export const getPageInfo = activeTabTool<void>({
  failure: 'Failed to get page info',
  run: async ({ tab }) => {
    const result = await cdpCommander.sendCommand<EvaluateResult>(
      tab.id,
      'Runtime.evaluate',
      {
        expression: `
          (function() {
            return {
              readyState: document.readyState,
              viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
                scrollX: Math.round(window.scrollX),
                scrollY: Math.round(window.scrollY),
                scrollHeight: document.body.scrollHeight,
                scrollWidth: document.body.scrollWidth
              }
            };
          })()
        `,
        returnByValue: true,
      }
    )

    const pageData = result.result.value as {
      readyState: string
      viewport: {
        width: number
        height: number
        scrollX: number
        scrollY: number
        scrollHeight: number
        scrollWidth: number
      }
    }

    const info = {
      title: tab.title || 'Untitled',
      url: tab.url || '',
      tabId: tab.id,
      ...pageData,
    }

    return { data: JSON.stringify(info, null, 2) }
  },
})

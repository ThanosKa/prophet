import { z } from 'zod'
import { AGENT_SIZE_LIMITS } from '@prophet/shared'
import { cdpCommander } from '../cdp-commander'
import { evaluateResultSchema } from '../cdp-results'
import { activeTabTool, navigateAndWaitForLoad } from './tab-tool'
import { type ScrollDirection, type PageContent } from '../types'

const pageInfoSchema = z.object({
  readyState: z.string(),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
    scrollX: z.number(),
    scrollY: z.number(),
    scrollHeight: z.number(),
    scrollWidth: z.number(),
  }),
})

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

    await cdpCommander.sendCommand(tab.id, 'Runtime.evaluate', {
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
    const result = evaluateResultSchema.parse(await cdpCommander.sendCommand(
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
    ))

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'Failed to get page content')
    }

    const content: PageContent = {
      url: tab.url || '',
      title: tab.title || '',
      text: (typeof result.result.value === 'string' && result.result.value) || '',
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

export const goForward = activeTabTool<void>({
  failure: 'Failed to go forward',
  run: async ({ tab }) => {
    await navigateAndWaitForLoad({ tabId: tab.id, timeoutMs: 5000, navigate: () => chrome.tabs.goForward(tab.id) })

    const updatedTab = await chrome.tabs.get(tab.id)

    return { data: `Navigated forward to: ${updatedTab.title || updatedTab.url}` }
  },
})

export const reloadPage = activeTabTool<void>({
  failure: 'Failed to reload page',
  run: async ({ tab }) => {
    await navigateAndWaitForLoad({ tabId: tab.id, timeoutMs: 30000, navigate: () => chrome.tabs.reload(tab.id) })

    return { data: 'Page reloaded' }
  },
})

export const getPageInfo = activeTabTool<void>({
  failure: 'Failed to get page info',
  run: async ({ tab }) => {
    const result = evaluateResultSchema.parse(await cdpCommander.sendCommand(
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
    ))

    const pageData = pageInfoSchema.parse(result.result.value)

    const info = {
      title: tab.title || 'Untitled',
      url: tab.url || '',
      tabId: tab.id,
      ...pageData,
    }

    return { data: JSON.stringify(info, null, 2) }
  },
})

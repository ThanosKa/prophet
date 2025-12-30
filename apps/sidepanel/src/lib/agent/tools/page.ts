import { cdpCommander, type EvaluateResult } from '../cdp-commander'
import { smartLocator } from '../smart-locator'
import { type ToolExecutionResult, type ScrollDirection, type PageContent } from '../types'

export async function navigate(input: { url: string }): Promise<ToolExecutionResult> {
  const startTime = Date.now()

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return {
        success: false,
        error: 'No active tab found',
        durationMs: Date.now() - startTime,
      }
    }

    let url = input.url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }

    await chrome.tabs.update(tab.id, { url })

    await new Promise<void>((resolve) => {
      const listener = (
        tabId: number,
        changeInfo: chrome.tabs.TabChangeInfo
      ) => {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener)
          resolve()
        }
      }
      chrome.tabs.onUpdated.addListener(listener)

      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }, 30000)
    })

    return {
      success: true,
      data: `Navigated to ${url}`,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to navigate',
      durationMs: Date.now() - startTime,
    }
  }
}

export async function scrollPage(input: {
  direction: ScrollDirection
  pixels?: number
}): Promise<ToolExecutionResult> {
  const startTime = Date.now()

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return {
        success: false,
        error: 'No active tab found',
        durationMs: Date.now() - startTime,
      }
    }

    const pixels = input.pixels ?? 500
    let scrollExpression: string

    switch (input.direction) {
      case 'up':
        scrollExpression = `window.scrollBy(0, -${pixels})`
        break
      case 'down':
        scrollExpression = `window.scrollBy(0, ${pixels})`
        break
      case 'left':
        scrollExpression = `window.scrollBy(-${pixels}, 0)`
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
        return {
          success: false,
          error: `Invalid scroll direction: ${input.direction}`,
          durationMs: Date.now() - startTime,
        }
    }

    await cdpCommander.sendCommand<EvaluateResult>(tab.id, 'Runtime.evaluate', {
      expression: scrollExpression,
      awaitPromise: false,
    })

    await new Promise((resolve) => setTimeout(resolve, 100))

    return {
      success: true,
      data: `Scrolled ${input.direction}${input.direction !== 'top' && input.direction !== 'bottom' ? ` by ${pixels}px` : ''}`,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to scroll',
      durationMs: Date.now() - startTime,
    }
  }
}

export async function getPageContent(): Promise<ToolExecutionResult> {
  const startTime = Date.now()

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return {
        success: false,
        error: 'No active tab found',
        durationMs: Date.now() - startTime,
      }
    }

    const result = await cdpCommander.sendCommand<EvaluateResult>(
      tab.id,
      'Runtime.evaluate',
      {
        expression: `
          (function() {
            const walker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              null
            );
            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
              const text = node.textContent.trim();
              if (text) {
                textNodes.push(text);
              }
            }
            return textNodes.join(' ').substring(0, 50000);
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

    return {
      success: true,
      data: `Page: ${content.title}\nURL: ${content.url}\n\nContent:\n${content.text}`,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get page content',
      durationMs: Date.now() - startTime,
    }
  }
}

export async function pressKey(input: {
  key: string
  modifiers?: Array<'ctrl' | 'alt' | 'shift' | 'meta'>
}): Promise<ToolExecutionResult> {
  const startTime = Date.now()

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return {
        success: false,
        error: 'No active tab found',
        durationMs: Date.now() - startTime,
      }
    }

    await smartLocator.pressKey(tab.id, input.key, input.modifiers || [])

    const modifierStr = input.modifiers?.length
      ? `${input.modifiers.join('+')}+`
      : ''

    return {
      success: true,
      data: `Pressed key: ${modifierStr}${input.key}`,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to press key',
      durationMs: Date.now() - startTime,
    }
  }
}

/**
 * Navigate back in browser history.
 */
export async function goBack(): Promise<ToolExecutionResult> {
  const startTime = Date.now()

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return {
        success: false,
        error: 'No active tab found',
        durationMs: Date.now() - startTime,
      }
    }

    await chrome.tabs.goBack(tab.id)

    // Wait for navigation to complete
    await new Promise<void>((resolve) => {
      const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener)
          resolve()
        }
      }
      chrome.tabs.onUpdated.addListener(listener)
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }, 5000)
    })

    const updatedTab = await chrome.tabs.get(tab.id)

    return {
      success: true,
      data: `Navigated back to: ${updatedTab.title || updatedTab.url}`,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to go back',
      durationMs: Date.now() - startTime,
    }
  }
}

/**
 * Navigate forward in browser history.
 */
export async function goForward(): Promise<ToolExecutionResult> {
  const startTime = Date.now()

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return {
        success: false,
        error: 'No active tab found',
        durationMs: Date.now() - startTime,
      }
    }

    await chrome.tabs.goForward(tab.id)

    // Wait for navigation to complete
    await new Promise<void>((resolve) => {
      const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener)
          resolve()
        }
      }
      chrome.tabs.onUpdated.addListener(listener)
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }, 5000)
    })

    const updatedTab = await chrome.tabs.get(tab.id)

    return {
      success: true,
      data: `Navigated forward to: ${updatedTab.title || updatedTab.url}`,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to go forward',
      durationMs: Date.now() - startTime,
    }
  }
}

/**
 * Reload the current page.
 */
export async function reloadPage(): Promise<ToolExecutionResult> {
  const startTime = Date.now()

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return {
        success: false,
        error: 'No active tab found',
        durationMs: Date.now() - startTime,
      }
    }

    await chrome.tabs.reload(tab.id)

    // Wait for reload to complete
    await new Promise<void>((resolve) => {
      const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener)
          resolve()
        }
      }
      chrome.tabs.onUpdated.addListener(listener)
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener)
        resolve()
      }, 30000)
    })

    return {
      success: true,
      data: 'Page reloaded',
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reload page',
      durationMs: Date.now() - startTime,
    }
  }
}

/**
 * Get information about the current page.
 */
export async function getPageInfo(): Promise<ToolExecutionResult> {
  const startTime = Date.now()

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return {
        success: false,
        error: 'No active tab found',
        durationMs: Date.now() - startTime,
      }
    }

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

    return {
      success: true,
      data: JSON.stringify(info, null, 2),
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get page info',
      durationMs: Date.now() - startTime,
    }
  }
}


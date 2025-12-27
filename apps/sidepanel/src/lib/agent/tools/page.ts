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

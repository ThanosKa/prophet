import { smartLocator } from '../smart-locator'
import { type ToolExecutionResult } from '../types'

export async function clickElementByUid(input: {
  uid: string
  doubleClick?: boolean
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

    await smartLocator.click(tab.id, input.uid, input.doubleClick ?? false)

    return {
      success: true,
      data: `Clicked element with uid="${input.uid}"${input.doubleClick ? ' (double-click)' : ''}`,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to click element',
      durationMs: Date.now() - startTime,
    }
  }
}

export async function fillElementByUid(input: {
  uid: string
  value: string
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

    await smartLocator.fill(tab.id, input.uid, input.value)

    return {
      success: true,
      data: `Filled element with uid="${input.uid}" with value "${input.value}"`,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fill element',
      durationMs: Date.now() - startTime,
    }
  }
}

export async function hoverElementByUid(input: { uid: string }): Promise<ToolExecutionResult> {
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

    await smartLocator.hover(tab.id, input.uid)

    return {
      success: true,
      data: `Hovered over element with uid="${input.uid}"`,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to hover over element',
      durationMs: Date.now() - startTime,
    }
  }
}

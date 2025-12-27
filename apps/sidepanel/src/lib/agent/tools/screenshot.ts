import { cdpCommander } from '../cdp-commander'
import { type ToolExecutionResult, type ScreenshotResult } from '../types'

interface CaptureScreenshotResult {
  data: string
}

export async function takeScreenshot(): Promise<ToolExecutionResult> {
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

    const result = await cdpCommander.sendCommand<CaptureScreenshotResult>(
      tab.id,
      'Page.captureScreenshot',
      {
        format: 'png',
        quality: 80,
        captureBeyondViewport: false,
      }
    )

    if (!result.data) {
      throw new Error('No screenshot data returned')
    }

    const screenshotResult: ScreenshotResult = {
      base64: result.data,
      mimeType: 'image/png',
      width: 0,
      height: 0,
    }

    return {
      success: true,
      data: screenshotResult,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to take screenshot',
      durationMs: Date.now() - startTime,
    }
  }
}

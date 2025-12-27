import { snapshotManager } from '../snapshot-manager'
import { type ToolExecutionResult } from '../types'

export async function takeSnapshot(): Promise<ToolExecutionResult> {
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

    const snapshot = await snapshotManager.takeSnapshot(tab.id)
    const formattedSnapshot = snapshotManager.formatSnapshotAsText(snapshot)

    return {
      success: true,
      data: formattedSnapshot,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to take snapshot',
      durationMs: Date.now() - startTime,
    }
  }
}

export async function searchSnapshot(input: { query: string }): Promise<ToolExecutionResult> {
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

    const snapshot = snapshotManager.getSnapshot(tab.id)
    if (!snapshot) {
      return {
        success: false,
        error: 'No snapshot available. Call take_snapshot first.',
        durationMs: Date.now() - startTime,
      }
    }

    const results = snapshotManager.searchSnapshot(tab.id, input.query)

    if (results.length === 0) {
      return {
        success: true,
        data: `No elements found matching "${input.query}"`,
        durationMs: Date.now() - startTime,
      }
    }

    const formatted = results
      .slice(0, 20)
      .map((node) => {
        const parts = [`uid=${node.uid}`, node.role]
        if (node.name) parts.push(`"${node.name}"`)
        if (node.value) parts.push(`value="${node.value}"`)
        if (node.tagName) parts.push(`<${node.tagName}>`)
        return parts.join(' ')
      })
      .join('\n')

    return {
      success: true,
      data: `Found ${results.length} elements matching "${input.query}":\n\n${formatted}`,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search snapshot',
      durationMs: Date.now() - startTime,
    }
  }
}

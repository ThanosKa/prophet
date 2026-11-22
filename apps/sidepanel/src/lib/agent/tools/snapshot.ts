import { AGENT_SIZE_LIMITS } from '@prophet/shared'
import { capNodeText, snapshotManager } from '../snapshot-manager'
import { type ToolExecutionResult } from '../types'
import { activeTabTool } from './tab-tool'

function capSnapshotText(text: string): string {
  const limit = AGENT_SIZE_LIMITS.snapshotChars
  if (text.length <= limit) return text
  const note = (shown: number) =>
    `\n\n[Snapshot shortened: showing the first ${shown} of ${text.length} characters. ` +
    'Use search_snapshot to find elements that are not listed above.]'
  const budget = limit - note(text.length).length
  const lastBreak = text.lastIndexOf('\n', budget)
  const head = text.slice(0, lastBreak > 0 ? lastBreak : budget)
  return `${head}${note(head.length)}`
}

const takeSnapshotTool = activeTabTool<undefined>({
  failure: 'Failed to take snapshot',
  run: async ({ tab }) => {
    const snapshot = await snapshotManager.takeSnapshot(tab.id)
    return {
      data: capSnapshotText(snapshotManager.formatSnapshotAsText(snapshot)),
    }
  },
})

export function takeSnapshot(): Promise<ToolExecutionResult> {
  return takeSnapshotTool(undefined)
}

export const searchSnapshot = activeTabTool<{ query: string }>({
  failure: 'Failed to search snapshot',
  run: async ({ input, tab }) => {
    const snapshot = snapshotManager.getSnapshot(tab.id)
    if (!snapshot) {
      return { error: 'No snapshot available. Call take_snapshot first.' }
    }

    const results = snapshotManager.searchSnapshot(tab.id, input.query)

    if (results.length === 0) {
      return { data: `No elements found matching "${input.query}"` }
    }

    const formatted = results
      .slice(0, 20)
      .map((node) => {
        const parts = [`uid=${node.uid}`, node.role]
        if (node.name) parts.push(`"${capNodeText(node.name)}"`)
        if (node.value) parts.push(`value="${capNodeText(node.value)}"`)
        if (node.tagName) parts.push(`<${node.tagName}>`)
        return parts.join(' ')
      })
      .join('\n')

    return {
      data: `Found ${results.length} elements matching "${input.query}":\n\n${formatted}`,
    }
  },
})

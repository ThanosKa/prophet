import { cdpCommander, type AXNode, type AXTreeResult, type ResolveNodeResult, type CallFunctionOnResult } from './cdp-commander'
import { type Snapshot, type SnapshotNode, INTERACTIVE_ROLES, SEMANTIC_ROLES } from './types'

const UID_ATTRIBUTE = 'data-prophet-nodeid'
const UID_LENGTH = 8

function generateUid(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < UID_LENGTH; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

class SnapshotManagerClass {
  private snapshots = new Map<number, Snapshot>()

  async takeSnapshot(tabId: number): Promise<Snapshot> {
    await cdpCommander.enable(tabId, 'Accessibility')
    await cdpCommander.enable(tabId, 'DOM')

    const tab = await chrome.tabs.get(tabId)
    const url = tab.url || ''
    const title = tab.title || ''

    const axTree = await cdpCommander.sendCommand<AXTreeResult>(
      tabId,
      'Accessibility.getFullAXTree'
    )

    const nodeMap = new Map<string, AXNode>()
    for (const node of axTree.nodes) {
      nodeMap.set(node.nodeId, node)
    }

    const interestingNodes = this.filterInterestingNodes(axTree.nodes, nodeMap)

    await this.injectUids(tabId, interestingNodes)

    const idToNode = new Map<string, SnapshotNode>()
    const root = this.buildSnapshotTree(interestingNodes, nodeMap, idToNode)

    const snapshot: Snapshot = {
      root,
      idToNode,
      tabId,
      url,
      title,
      timestamp: Date.now(),
    }

    this.snapshots.set(tabId, snapshot)

    return snapshot
  }

  getSnapshot(tabId: number): Snapshot | undefined {
    return this.snapshots.get(tabId)
  }

  getNodeByUid(tabId: number, uid: string): SnapshotNode | undefined {
    const snapshot = this.snapshots.get(tabId)
    if (!snapshot) return undefined
    return snapshot.idToNode.get(uid)
  }

  clearSnapshot(tabId: number): void {
    this.snapshots.delete(tabId)
  }

  formatSnapshotAsText(snapshot: Snapshot): string {
    const lines: string[] = []
    lines.push(`Page: ${snapshot.title}`)
    lines.push(`URL: ${snapshot.url}`)
    lines.push('')
    lines.push('Interactive Elements:')
    lines.push('')

    this.formatNodeAsText(snapshot.root, lines, 0)

    return lines.join('\n')
  }

  private formatNodeAsText(node: SnapshotNode, lines: string[], depth: number): void {
    const indent = '  '.repeat(depth)
    const parts: string[] = []

    parts.push(`uid=${node.uid}`)
    parts.push(node.role)

    if (node.name) {
      parts.push(`"${node.name}"`)
    }

    if (node.value !== undefined && node.value !== '') {
      parts.push(`value="${node.value}"`)
    }

    if (node.tagName) {
      parts.push(`<${node.tagName}>`)
    }

    const flags: string[] = []
    if (node.focused) flags.push('focused')
    if (node.disabled) flags.push('disabled')
    if (node.checked) flags.push('checked')
    if (node.selected) flags.push('selected')
    if (node.expanded !== undefined) flags.push(node.expanded ? 'expanded' : 'collapsed')

    if (flags.length > 0) {
      parts.push(`[${flags.join(', ')}]`)
    }

    lines.push(`${indent}${parts.join(' ')}`)

    for (const child of node.children) {
      this.formatNodeAsText(child, lines, depth + 1)
    }
  }

  private filterInterestingNodes(nodes: AXNode[], nodeMap: Map<string, AXNode>): AXNode[] {
    const interesting: AXNode[] = []

    for (const node of nodes) {
      if (node.ignored) continue
      if (!node.role?.value) continue
      if (!node.backendDOMNodeId) continue

      const role = node.role.value.toLowerCase()

      if (INTERACTIVE_ROLES.has(role) || SEMANTIC_ROLES.has(role)) {
        interesting.push(node)
        continue
      }

      if (role === 'statictext' || role === 'inlinebox') {
        continue
      }

      const name = node.name?.value
      if (name && typeof name === 'string' && name.trim().length > 0) {
        const hasInteractiveAncestor = this.hasInteractiveAncestor(node, nodeMap)
        if (!hasInteractiveAncestor) {
          interesting.push(node)
        }
      }
    }

    return interesting
  }

  private hasInteractiveAncestor(_node: AXNode, _nodeMap: Map<string, AXNode>): boolean {
    return false
  }

  private async injectUids(tabId: number, nodes: AXNode[]): Promise<void> {
    const existingUids = new Map<number, string>()

    const batchSize = 20
    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async (node) => {
          if (!node.backendDOMNodeId) return

          try {
            const resolved = await cdpCommander.sendCommand<ResolveNodeResult>(
              tabId,
              'DOM.resolveNode',
              { backendNodeId: node.backendDOMNodeId }
            )

            if (!resolved.object.objectId) return

            const result = await cdpCommander.sendCommand<CallFunctionOnResult>(
              tabId,
              'Runtime.callFunctionOn',
              {
                objectId: resolved.object.objectId,
                functionDeclaration: `function() {
                  if (this && this.getAttribute) {
                    return this.getAttribute('${UID_ATTRIBUTE}');
                  }
                  return null;
                }`,
                returnByValue: true,
              }
            )

            if (result.result.value) {
              existingUids.set(node.backendDOMNodeId, result.result.value as string)
            }

            await cdpCommander.sendCommand(tabId, 'Runtime.releaseObject', {
              objectId: resolved.object.objectId,
            })
          } catch {
            // Ignore errors for individual nodes
          }
        })
      )
    }

    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async (node) => {
          if (!node.backendDOMNodeId) return

          const existingUid = existingUids.get(node.backendDOMNodeId)
          if (existingUid) return

          const uid = generateUid()

          try {
            const resolved = await cdpCommander.sendCommand<ResolveNodeResult>(
              tabId,
              'DOM.resolveNode',
              { backendNodeId: node.backendDOMNodeId }
            )

            if (!resolved.object.objectId) return

            await cdpCommander.sendCommand<CallFunctionOnResult>(
              tabId,
              'Runtime.callFunctionOn',
              {
                objectId: resolved.object.objectId,
                functionDeclaration: `function(uid) {
                  if (this && this.setAttribute) {
                    this.setAttribute('${UID_ATTRIBUTE}', uid);
                  }
                }`,
                arguments: [{ value: uid }],
                returnByValue: true,
              }
            )

            existingUids.set(node.backendDOMNodeId, uid)

            await cdpCommander.sendCommand(tabId, 'Runtime.releaseObject', {
              objectId: resolved.object.objectId,
            })
          } catch {
            // Ignore errors for individual nodes
          }
        })
      )
    }

    for (const node of nodes) {
      if (node.backendDOMNodeId) {
        const uid = existingUids.get(node.backendDOMNodeId)
        if (uid) {
          (node as AXNode & { uid?: string }).uid = uid
        }
      }
    }
  }

  private buildSnapshotTree(
    nodes: AXNode[],
    _nodeMap: Map<string, AXNode>,
    idToNode: Map<string, SnapshotNode>
  ): SnapshotNode {
    const root: SnapshotNode = {
      uid: 'root',
      role: 'RootWebArea',
      name: '',
      children: [],
    }

    for (const axNode of nodes) {
      const uid = (axNode as AXNode & { uid?: string }).uid
      if (!uid) continue

      const snapshotNode = this.axNodeToSnapshotNode(axNode, uid)
      idToNode.set(uid, snapshotNode)
      root.children.push(snapshotNode)
    }

    return root
  }

  private axNodeToSnapshotNode(axNode: AXNode, uid: string): SnapshotNode {
    const role = axNode.role?.value || 'unknown'
    const name = axNode.name?.value as string || ''
    const value = axNode.value?.value

    const properties: Record<string, boolean | undefined> = {}
    if (axNode.properties) {
      for (const prop of axNode.properties) {
        if (prop.name === 'focused' && prop.value.value) properties.focused = true
        if (prop.name === 'disabled' && prop.value.value) properties.disabled = true
        if (prop.name === 'checked' && prop.value.value) properties.checked = true
        if (prop.name === 'selected' && prop.value.value) properties.selected = true
        if (prop.name === 'expanded') properties.expanded = prop.value.value as boolean
      }
    }

    return {
      uid,
      role,
      name,
      value: value !== undefined ? String(value) : undefined,
      backendDOMNodeId: axNode.backendDOMNodeId,
      focused: properties.focused,
      disabled: properties.disabled,
      checked: properties.checked,
      selected: properties.selected,
      expanded: properties.expanded,
      children: [],
    }
  }

  searchSnapshot(tabId: number, query: string): SnapshotNode[] {
    const snapshot = this.snapshots.get(tabId)
    if (!snapshot) return []

    const lowerQuery = query.toLowerCase()
    const results: SnapshotNode[] = []

    for (const [, node] of snapshot.idToNode) {
      const matchesName = node.name.toLowerCase().includes(lowerQuery)
      const matchesRole = node.role.toLowerCase().includes(lowerQuery)
      const matchesValue = node.value?.toLowerCase().includes(lowerQuery)

      if (matchesName || matchesRole || matchesValue) {
        results.push(node)
      }
    }

    return results
  }
}

export const snapshotManager = new SnapshotManagerClass()

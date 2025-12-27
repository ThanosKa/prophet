import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AXNode } from './cdp-commander'

// Mock CDP commander
vi.mock('./cdp-commander', () => ({
  cdpCommander: {
    enable: vi.fn(),
    sendCommand: vi.fn(),
  },
}))

// Mock chrome.tabs API
global.chrome = {
  tabs: {
    get: vi.fn(),
  },
} as any

// Import after mocks
const { cdpCommander } = await import('./cdp-commander')
const { snapshotManager } = await import('./snapshot-manager')

describe('SnapshotManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('takeSnapshot', () => {
    it('enables Accessibility and DOM domains', async () => {
      const mockAxTree = { nodes: [] }

      vi.mocked(chrome.tabs.get).mockResolvedValue({
        url: 'https://example.com',
        title: 'Example',
      } as any)

      vi.mocked(cdpCommander.sendCommand).mockResolvedValue(mockAxTree)

      await snapshotManager.takeSnapshot(1)

      expect(cdpCommander.enable).toHaveBeenCalledWith(1, 'Accessibility')
      expect(cdpCommander.enable).toHaveBeenCalledWith(1, 'DOM')
    })

    it('fetches full AX tree', async () => {
      const mockAxTree = { nodes: [] }

      vi.mocked(chrome.tabs.get).mockResolvedValue({
        url: 'https://example.com',
        title: 'Example',
      } as any)

      vi.mocked(cdpCommander.sendCommand).mockResolvedValue(mockAxTree)

      await snapshotManager.takeSnapshot(1)

      expect(cdpCommander.sendCommand).toHaveBeenCalledWith(
        1,
        'Accessibility.getFullAXTree'
      )
    })

    it('filters out ignored nodes', async () => {
      const mockAxTree = {
        nodes: [
          {
            nodeId: '1',
            ignored: true,
            role: { value: 'button' },
            backendDOMNodeId: 1,
          },
          {
            nodeId: '2',
            ignored: false,
            role: { value: 'button' },
            backendDOMNodeId: 2,
          },
        ] as AXNode[],
      }

      vi.mocked(chrome.tabs.get).mockResolvedValue({
        url: 'https://example.com',
        title: 'Example',
      } as any)

      vi.mocked(cdpCommander.sendCommand)
        .mockResolvedValueOnce(mockAxTree)
        .mockResolvedValue({
          object: { objectId: 'obj1' },
          result: { value: null },
        })

      const snapshot = await snapshotManager.takeSnapshot(1)

      // Only 1 button should be in the snapshot (the non-ignored one)
      expect(snapshot.idToNode.size).toBe(1)
    })

    it('filters out nodes without backendDOMNodeId', async () => {
      const mockAxTree = {
        nodes: [
          {
            nodeId: '1',
            ignored: false,
            role: { value: 'button' },
            // Missing backendDOMNodeId
          },
          {
            nodeId: '2',
            ignored: false,
            role: { value: 'button' },
            backendDOMNodeId: 2,
          },
        ] as AXNode[],
      }

      vi.mocked(chrome.tabs.get).mockResolvedValue({
        url: 'https://example.com',
        title: 'Example',
      } as any)

      vi.mocked(cdpCommander.sendCommand)
        .mockResolvedValueOnce(mockAxTree)
        .mockResolvedValue({
          object: { objectId: 'obj1' },
          result: { value: null },
        })

      const snapshot = await snapshotManager.takeSnapshot(1)

      expect(snapshot.idToNode.size).toBe(1)
    })

    it('includes INTERACTIVE_ROLES', async () => {
      const mockAxTree = {
        nodes: [
          {
            nodeId: '1',
            ignored: false,
            role: { value: 'button' },
            backendDOMNodeId: 1,
            name: { value: 'Submit' },
          },
          {
            nodeId: '2',
            ignored: false,
            role: { value: 'textbox' },
            backendDOMNodeId: 2,
            name: { value: 'Email' },
          },
        ] as AXNode[],
      }

      vi.mocked(chrome.tabs.get).mockResolvedValue({
        url: 'https://example.com',
        title: 'Example',
      } as any)

      vi.mocked(cdpCommander.sendCommand)
        .mockResolvedValueOnce(mockAxTree)
        .mockResolvedValue({
          object: { objectId: 'obj1' },
          result: { value: null },
        })

      const snapshot = await snapshotManager.takeSnapshot(1)

      expect(snapshot.idToNode.size).toBe(2)
    })

    it('excludes statictext and inlinebox roles', async () => {
      const mockAxTree = {
        nodes: [
          {
            nodeId: '1',
            ignored: false,
            role: { value: 'StaticText' },
            backendDOMNodeId: 1,
            name: { value: 'Some text' },
          },
          {
            nodeId: '2',
            ignored: false,
            role: { value: 'InlineBox' },
            backendDOMNodeId: 2,
            name: { value: 'Inline' },
          },
          {
            nodeId: '3',
            ignored: false,
            role: { value: 'button' },
            backendDOMNodeId: 3,
            name: { value: 'Submit' },
          },
        ] as AXNode[],
      }

      vi.mocked(chrome.tabs.get).mockResolvedValue({
        url: 'https://example.com',
        title: 'Example',
      } as any)

      vi.mocked(cdpCommander.sendCommand)
        .mockResolvedValueOnce(mockAxTree)
        .mockResolvedValue({
          object: { objectId: 'obj1' },
          result: { value: null },
        })

      const snapshot = await snapshotManager.takeSnapshot(1)

      // Only the button should be included
      expect(snapshot.idToNode.size).toBe(1)
    })

    it('stores snapshot in cache', async () => {
      const mockAxTree = { nodes: [] }

      vi.mocked(chrome.tabs.get).mockResolvedValue({
        url: 'https://example.com',
        title: 'Example',
      } as any)

      vi.mocked(cdpCommander.sendCommand).mockResolvedValue(mockAxTree)

      const snapshot = await snapshotManager.takeSnapshot(1)

      const cached = snapshotManager.getSnapshot(1)
      expect(cached).toBe(snapshot)
    })
  })

  describe('getSnapshot', () => {
    it('returns undefined for non-existent snapshot', () => {
      const snapshot = snapshotManager.getSnapshot(999)
      expect(snapshot).toBeUndefined()
    })
  })

  describe('getNodeByUid', () => {
    it('returns node by UID', async () => {
      const mockAxTree = {
        nodes: [
          {
            nodeId: '1',
            ignored: false,
            role: { value: 'button' },
            backendDOMNodeId: 1,
            name: { value: 'Submit' },
          },
        ] as AXNode[],
      }

      vi.mocked(chrome.tabs.get).mockResolvedValue({
        url: 'https://example.com',
        title: 'Example',
      } as any)

      // Mock the sequence of CDP calls:
      // 1. getFullAXTree
      // 2. DOM.resolveNode (check existing UID)
      // 3. Runtime.callFunctionOn (get existing UID - returns null)
      // 4. Runtime.releaseObject
      // 5. DOM.resolveNode (inject new UID)
      // 6. Runtime.callFunctionOn (set UID)
      // 7. Runtime.releaseObject
      vi.mocked(cdpCommander.sendCommand)
        .mockResolvedValueOnce(mockAxTree) // getFullAXTree
        .mockResolvedValueOnce({ object: { objectId: 'obj1' } }) // DOM.resolveNode (check)
        .mockResolvedValueOnce({ result: { value: null } }) // Runtime.callFunctionOn (get - returns null)
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject
        .mockResolvedValueOnce({ object: { objectId: 'obj2' } }) // DOM.resolveNode (inject)
        .mockResolvedValueOnce({ result: {} }) // Runtime.callFunctionOn (set)
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject

      const snapshot = await snapshotManager.takeSnapshot(1)

      // Get the actual UID that was generated
      const actualUid = Array.from(snapshot.idToNode.keys())[0]

      // Should have at least one node with a UID
      expect(snapshot.idToNode.size).toBeGreaterThan(0)
      expect(actualUid).toBeDefined()

      const node = snapshotManager.getNodeByUid(1, actualUid!)

      expect(node).toBeDefined()
      expect(node?.role).toBe('button')
      expect(node?.name).toBe('Submit')
    })

    it('returns undefined for non-existent UID', () => {
      const node = snapshotManager.getNodeByUid(1, 'nonexistent')
      expect(node).toBeUndefined()
    })

    it('returns undefined for non-existent tabId', () => {
      const node = snapshotManager.getNodeByUid(999, 'Ab12Cd3E')
      expect(node).toBeUndefined()
    })
  })

  describe('clearSnapshot', () => {
    it('removes snapshot from cache', async () => {
      const mockAxTree = { nodes: [] }

      vi.mocked(chrome.tabs.get).mockResolvedValue({
        url: 'https://example.com',
        title: 'Example',
      } as any)

      vi.mocked(cdpCommander.sendCommand).mockResolvedValue(mockAxTree)

      await snapshotManager.takeSnapshot(1)
      expect(snapshotManager.getSnapshot(1)).toBeDefined()

      snapshotManager.clearSnapshot(1)
      expect(snapshotManager.getSnapshot(1)).toBeUndefined()
    })
  })

  describe('formatSnapshotAsText', () => {
    it('includes page title and URL', async () => {
      const mockAxTree = { nodes: [] }

      vi.mocked(chrome.tabs.get).mockResolvedValue({
        url: 'https://example.com/page',
        title: 'Example Page',
      } as any)

      vi.mocked(cdpCommander.sendCommand).mockResolvedValue(mockAxTree)

      const snapshot = await snapshotManager.takeSnapshot(1)
      const text = snapshotManager.formatSnapshotAsText(snapshot)

      expect(text).toContain('Page: Example Page')
      expect(text).toContain('URL: https://example.com/page')
    })

    it('includes uid, role, and name', async () => {
      const mockAxTree = {
        nodes: [
          {
            nodeId: '1',
            ignored: false,
            role: { value: 'button' },
            backendDOMNodeId: 1,
            name: { value: 'Submit' },
          },
        ] as AXNode[],
      }

      vi.mocked(chrome.tabs.get).mockResolvedValue({
        url: 'https://example.com',
        title: 'Example',
      } as any)

      vi.mocked(cdpCommander.sendCommand)
        .mockResolvedValueOnce(mockAxTree)
        .mockResolvedValue({
          object: { objectId: 'obj1' },
          result: { value: null },
        })

      const snapshot = await snapshotManager.takeSnapshot(1)
      const text = snapshotManager.formatSnapshotAsText(snapshot)

      expect(text).toMatch(/uid=\w+ button "Submit"/)
    })

    it('includes value if present', async () => {
      const mockAxTree = {
        nodes: [
          {
            nodeId: '1',
            ignored: false,
            role: { value: 'textbox' },
            backendDOMNodeId: 1,
            name: { value: 'Email' },
            value: { value: 'test@example.com' },
          },
        ] as AXNode[],
      }

      vi.mocked(chrome.tabs.get).mockResolvedValue({
        url: 'https://example.com',
        title: 'Example',
      } as any)

      vi.mocked(cdpCommander.sendCommand)
        .mockResolvedValueOnce(mockAxTree)
        .mockResolvedValue({
          object: { objectId: 'obj1' },
          result: { value: null },
        })

      const snapshot = await snapshotManager.takeSnapshot(1)
      const text = snapshotManager.formatSnapshotAsText(snapshot)

      expect(text).toContain('value="test@example.com"')
    })

    it('includes flags: focused, disabled, checked, selected', async () => {
      const mockAxTree = {
        nodes: [
          {
            nodeId: '1',
            ignored: false,
            role: { value: 'checkbox' },
            backendDOMNodeId: 1,
            name: { value: 'Agree' },
            properties: [
              { name: 'checked', value: { value: true } },
              { name: 'focused', value: { value: true } },
            ],
          },
        ] as AXNode[],
      }

      vi.mocked(chrome.tabs.get).mockResolvedValue({
        url: 'https://example.com',
        title: 'Example',
      } as any)

      vi.mocked(cdpCommander.sendCommand)
        .mockResolvedValueOnce(mockAxTree)
        .mockResolvedValue({
          object: { objectId: 'obj1' },
          result: { value: null },
        })

      const snapshot = await snapshotManager.takeSnapshot(1)
      const text = snapshotManager.formatSnapshotAsText(snapshot)

      expect(text).toContain('[focused, checked]')
    })
  })

  describe('searchSnapshot', () => {
    beforeEach(async () => {
      const mockAxTree = {
        nodes: [
          {
            nodeId: '1',
            ignored: false,
            role: { value: 'button' },
            backendDOMNodeId: 1,
            name: { value: 'Submit Form' },
          },
          {
            nodeId: '2',
            ignored: false,
            role: { value: 'textbox' },
            backendDOMNodeId: 2,
            name: { value: 'Email Address' },
            value: { value: 'user@example.com' },
          },
          {
            nodeId: '3',
            ignored: false,
            role: { value: 'link' },
            backendDOMNodeId: 3,
            name: { value: 'Contact Us' },
          },
        ] as AXNode[],
      }

      vi.mocked(chrome.tabs.get).mockResolvedValue({
        url: 'https://example.com',
        title: 'Example',
      } as any)

      vi.mocked(cdpCommander.sendCommand)
        .mockResolvedValueOnce(mockAxTree)
        .mockResolvedValue({
          object: { objectId: 'obj1' },
          result: { value: null },
        })

      await snapshotManager.takeSnapshot(1)
    })

    it('finds nodes by name (case-insensitive)', () => {
      const results = snapshotManager.searchSnapshot(1, 'submit')

      expect(results.length).toBe(1)
      expect(results[0].name).toBe('Submit Form')
    })

    it('finds nodes by role', () => {
      const results = snapshotManager.searchSnapshot(1, 'textbox')

      expect(results.length).toBe(1)
      expect(results[0].role).toBe('textbox')
    })

    it('finds nodes by value', () => {
      const results = snapshotManager.searchSnapshot(1, 'example.com')

      expect(results.length).toBe(1)
      expect(results[0].value).toContain('example.com')
    })

    it('returns empty array for non-matching query', () => {
      const results = snapshotManager.searchSnapshot(1, 'nonexistent')

      expect(results).toEqual([])
    })

    it('returns empty array for non-existent tabId', () => {
      const results = snapshotManager.searchSnapshot(999, 'submit')

      expect(results).toEqual([])
    })

    it('performs partial matching', () => {
      const results = snapshotManager.searchSnapshot(1, 'Contact')

      expect(results.length).toBe(1)
      expect(results[0].name).toBe('Contact Us')
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SmartLocator } from './smart-locator'

// Mock CDP commander
vi.mock('./cdp-commander', () => ({
  cdpCommander: {
    sendCommand: vi.fn(),
  },
}))

// Mock snapshot manager
vi.mock('./snapshot-manager', () => ({
  snapshotManager: {
    getNodeByUid: vi.fn(),
  },
}))

// Import after mocks
const { cdpCommander } = await import('./cdp-commander')
const { snapshotManager } = await import('./snapshot-manager')

describe('SmartLocator', () => {
  let smartLocator: SmartLocator

  beforeEach(() => {
    vi.clearAllMocks()
    smartLocator = new SmartLocator()
  })

  describe('click', () => {
    it('throws if node UID not found in snapshot', async () => {
      vi.mocked(snapshotManager.getNodeByUid).mockReturnValue(undefined)

      await expect(smartLocator.click(1, 'invalid-uid')).rejects.toThrow(
        'Element with UID "invalid-uid" not found'
      )
    })

    it('scrolls element into view before clicking', async () => {
      vi.mocked(snapshotManager.getNodeByUid).mockReturnValue({
        uid: 'abc123',
        role: 'button',
        name: 'Submit',
        backendDOMNodeId: 42,
        children: [],
      })

      vi.mocked(cdpCommander.sendCommand)
        .mockResolvedValueOnce(undefined) // scrollIntoViewIfNeeded
        .mockResolvedValueOnce({ result: { value: { x: 100, y: 200, width: 50, height: 30 } } }) // getBoundingBox
        .mockResolvedValueOnce(undefined) // mousePressed
        .mockResolvedValueOnce(undefined) // mouseReleased

      await smartLocator.click(1, 'abc123')

      expect(cdpCommander.sendCommand).toHaveBeenCalledWith(
        1,
        'DOM.scrollIntoViewIfNeeded',
        expect.objectContaining({ backendNodeId: 42 })
      )
    })

    it('calculates center point from bounding box', async () => {
      vi.mocked(snapshotManager.getNodeByUid).mockReturnValue({
        uid: 'abc123',
        role: 'button',
        name: 'Submit',
        backendDOMNodeId: 42,
        children: [],
      })

      vi.mocked(cdpCommander.sendCommand)
        .mockResolvedValueOnce(undefined) // scrollIntoViewIfNeeded
        .mockResolvedValueOnce({ result: { value: { x: 100, y: 200, width: 50, height: 30 } } }) // getBoundingBox
        .mockResolvedValueOnce(undefined) // mousePressed
        .mockResolvedValueOnce(undefined) // mouseReleased

      await smartLocator.click(1, 'abc123')

      // Center should be (100 + 25, 200 + 15) = (125, 215)
      expect(cdpCommander.sendCommand).toHaveBeenCalledWith(
        1,
        'Input.dispatchMouseEvent',
        expect.objectContaining({
          type: 'mousePressed',
          x: 125,
          y: 215,
        })
      )
    })

    it('dispatches mousePressed + mouseReleased to center point', async () => {
      vi.mocked(snapshotManager.getNodeByUid).mockReturnValue({
        uid: 'abc123',
        role: 'button',
        name: 'Submit',
        backendDOMNodeId: 42,
        children: [],
      })

      vi.mocked(cdpCommander.sendCommand)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ result: { value: { x: 100, y: 200, width: 50, height: 30 } } })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)

      await smartLocator.click(1, 'abc123')

      expect(cdpCommander.sendCommand).toHaveBeenCalledWith(
        1,
        'Input.dispatchMouseEvent',
        expect.objectContaining({ type: 'mousePressed', button: 'left', clickCount: 1 })
      )

      expect(cdpCommander.sendCommand).toHaveBeenCalledWith(
        1,
        'Input.dispatchMouseEvent',
        expect.objectContaining({ type: 'mouseReleased', button: 'left', clickCount: 1 })
      )
    })

    it('uses clickCount=2 for double-click', async () => {
      vi.mocked(snapshotManager.getNodeByUid).mockReturnValue({
        uid: 'abc123',
        role: 'button',
        name: 'Submit',
        backendDOMNodeId: 42,
        children: [],
      })

      vi.mocked(cdpCommander.sendCommand)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ result: { value: { x: 100, y: 200, width: 50, height: 30 } } })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)

      await smartLocator.click(1, 'abc123', true) // doubleClick = true

      expect(cdpCommander.sendCommand).toHaveBeenCalledWith(
        1,
        'Input.dispatchMouseEvent',
        expect.objectContaining({ clickCount: 2 })
      )
    })

    it('falls back to synthetic click if bounding box is 0x0', async () => {
      vi.mocked(snapshotManager.getNodeByUid).mockReturnValue({
        uid: 'abc123',
        role: 'button',
        name: 'Submit',
        backendDOMNodeId: 42,
        children: [],
      })

      vi.mocked(cdpCommander.sendCommand)
        .mockResolvedValueOnce(undefined) // scrollIntoViewIfNeeded
        .mockResolvedValueOnce({ result: { value: { x: 0, y: 0, width: 0, height: 0 } } }) // getBoundingBox
        .mockResolvedValueOnce(undefined) // Runtime.evaluate (synthetic click)

      await smartLocator.click(1, 'abc123')

      // Should use Runtime.evaluate for synthetic click
      expect(cdpCommander.sendCommand).toHaveBeenCalledWith(
        1,
        'Runtime.evaluate',
        expect.objectContaining({
          expression: expect.stringContaining('.click()'),
        })
      )
    })
  })

  describe('fill', () => {
    it('throws if node UID not found', async () => {
      vi.mocked(snapshotManager.getNodeByUid).mockReturnValue(undefined)

      await expect(smartLocator.fill(1, 'invalid-uid', 'text')).rejects.toThrow(
        'Element with UID "invalid-uid" not found'
      )
    })

    it('focuses element before filling', async () => {
      vi.mocked(snapshotManager.getNodeByUid).mockReturnValue({
        uid: 'abc123',
        role: 'textbox',
        name: 'Email',
        backendDOMNodeId: 42,
        children: [],
      })

      vi.mocked(cdpCommander.sendCommand).mockResolvedValue(undefined)

      await smartLocator.fill(1, 'abc123', 'test@example.com')

      // Should call Runtime.evaluate with .focus()
      expect(cdpCommander.sendCommand).toHaveBeenCalledWith(
        1,
        'Runtime.evaluate',
        expect.objectContaining({
          expression: expect.stringContaining('.focus()'),
        })
      )
    })

    it('selects all text (Cmd+A or Ctrl+A)', async () => {
      vi.mocked(snapshotManager.getNodeByUid).mockReturnValue({
        uid: 'abc123',
        role: 'textbox',
        name: 'Email',
        backendDOMNodeId: 42,
        children: [],
      })

      vi.mocked(cdpCommander.sendCommand).mockResolvedValue(undefined)

      await smartLocator.fill(1, 'abc123', 'text')

      // Should dispatch Cmd/Ctrl+A
      const calls = vi.mocked(cdpCommander.sendCommand).mock.calls
      const selectAllCalls = calls.filter(
        (call) => call[1] === 'Input.dispatchKeyEvent' && (call[2] as any)?.key === 'a'
      )

      expect(selectAllCalls.length).toBeGreaterThan(0)
    })

    it('inserts text via Input.insertText', async () => {
      vi.mocked(snapshotManager.getNodeByUid).mockReturnValue({
        uid: 'abc123',
        role: 'textbox',
        name: 'Email',
        backendDOMNodeId: 42,
        children: [],
      })

      vi.mocked(cdpCommander.sendCommand).mockResolvedValue(undefined)

      await smartLocator.fill(1, 'abc123', 'test@example.com')

      expect(cdpCommander.sendCommand).toHaveBeenCalledWith(
        1,
        'Input.insertText',
        { text: 'test@example.com' }
      )
    })

    it('clears field with Backspace if value is empty string', async () => {
      vi.mocked(snapshotManager.getNodeByUid).mockReturnValue({
        uid: 'abc123',
        role: 'textbox',
        name: 'Email',
        backendDOMNodeId: 42,
        children: [],
      })

      vi.mocked(cdpCommander.sendCommand).mockResolvedValue(undefined)

      await smartLocator.fill(1, 'abc123', '') // Empty string

      // Should dispatch Backspace instead of insertText
      const calls = vi.mocked(cdpCommander.sendCommand).mock.calls
      const backspaceCalls = calls.filter(
        (call) => call[1] === 'Input.dispatchKeyEvent' && (call[2] as any)?.key === 'Backspace'
      )

      expect(backspaceCalls.length).toBeGreaterThan(0)
    })

    it('dispatches input and change events after filling', async () => {
      vi.mocked(snapshotManager.getNodeByUid).mockReturnValue({
        uid: 'abc123',
        role: 'textbox',
        name: 'Email',
        backendDOMNodeId: 42,
        children: [],
      })

      vi.mocked(cdpCommander.sendCommand).mockResolvedValue(undefined)

      await smartLocator.fill(1, 'abc123', 'text')

      // Should call Runtime.evaluate with input/change events
      const calls = vi.mocked(cdpCommander.sendCommand).mock.calls
      const eventCalls = calls.filter(
        (call) =>
          call[1] === 'Runtime.evaluate' &&
          (call[2] as any)?.expression.includes('dispatchEvent')
      )

      expect(eventCalls.length).toBeGreaterThan(0)
      expect((eventCalls[0][2] as any)?.expression).toContain("new Event('input'")
      expect((eventCalls[0][2] as any)?.expression).toContain("new Event('change'")
    })
  })

  describe('hover', () => {
    it('throws if bounding box not found', async () => {
      vi.mocked(snapshotManager.getNodeByUid).mockReturnValue({
        uid: 'abc123',
        role: 'button',
        name: 'Submit',
        backendDOMNodeId: 42,
        children: [],
      })

      vi.mocked(cdpCommander.sendCommand)
        .mockResolvedValueOnce(undefined) // scrollIntoViewIfNeeded
        .mockResolvedValueOnce({ result: { value: null } }) // getBoundingBox returns null

      await expect(smartLocator.hover(1, 'abc123')).rejects.toThrow(
        'Could not get element bounding box'
      )
    })

    it('dispatches mouseMoved to center point', async () => {
      vi.mocked(snapshotManager.getNodeByUid).mockReturnValue({
        uid: 'abc123',
        role: 'button',
        name: 'Submit',
        backendDOMNodeId: 42,
        children: [],
      })

      vi.mocked(cdpCommander.sendCommand)
        .mockResolvedValueOnce(undefined) // scrollIntoViewIfNeeded
        .mockResolvedValueOnce({ result: { value: { x: 100, y: 200, width: 50, height: 30 } } }) // getBoundingBox
        .mockResolvedValueOnce(undefined) // mouseMoved

      await smartLocator.hover(1, 'abc123')

      expect(cdpCommander.sendCommand).toHaveBeenCalledWith(
        1,
        'Input.dispatchMouseEvent',
        expect.objectContaining({
          type: 'mouseMoved',
          x: 125,
          y: 215,
        })
      )
    })
  })

  describe('pressKey', () => {
    it('converts modifier array to bitfield', async () => {
      vi.mocked(cdpCommander.sendCommand).mockResolvedValue(undefined)

      // alt=1, ctrl=2, meta=4, shift=8
      // ctrl+shift = 2 + 8 = 10
      await smartLocator.pressKey(1, 'a', ['ctrl', 'shift'])

      const calls = vi.mocked(cdpCommander.sendCommand).mock.calls
      const keyDownCall = calls.find((call) => (call[2] as any)?.type === 'keyDown')

      expect(keyDownCall).toBeDefined()
      expect((keyDownCall![2] as any)?.modifiers).toBe(10) // ctrl(2) + shift(8)
    })

    it('maps special keys to correct keyCodes', async () => {
      vi.mocked(cdpCommander.sendCommand).mockResolvedValue(undefined)

      await smartLocator.pressKey(1, 'Enter', [])

      const calls = vi.mocked(cdpCommander.sendCommand).mock.calls
      const keyDownCall = calls.find((call) => (call[2] as any)?.type === 'keyDown')

      expect((keyDownCall![2] as any)?.code).toBe('Enter')
    })

    it('maps single chars to KeyA, Digit0 format', async () => {
      vi.mocked(cdpCommander.sendCommand).mockResolvedValue(undefined)

      await smartLocator.pressKey(1, 'a', [])

      const calls = vi.mocked(cdpCommander.sendCommand).mock.calls
      const keyDownCall = calls.find((call) => (call[2] as any)?.type === 'keyDown')

      expect((keyDownCall![2] as any)?.code).toBe('KeyA')
    })

    it('dispatches keyDown, char, keyUp', async () => {
      vi.mocked(cdpCommander.sendCommand).mockResolvedValue(undefined)

      await smartLocator.pressKey(1, 'a', [])

      const calls = vi.mocked(cdpCommander.sendCommand).mock.calls
      const types = calls
        .filter((call) => call[1] === 'Input.dispatchKeyEvent')
        .map((call) => (call[2] as any)?.type)

      expect(types).toContain('keyDown')
      expect(types).toContain('char')
      expect(types).toContain('keyUp')
    })
  })
})

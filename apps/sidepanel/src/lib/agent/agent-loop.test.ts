import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock background tool execution bridge
vi.mock('./background-bridge', () => ({
  executeToolViaBackground: vi.fn(),
}))

// Mock chrome.runtime API
global.chrome = {
  runtime: {
    sendMessage: vi.fn(),
  },
} as any

// Import after mocks
const { executeToolViaBackground } = await import('./background-bridge')
const { runAgentLoop } = await import('./agent-loop')

describe('runAgentLoop', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock auth token
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({
      token: 'mock-token',
    })
  })

  describe('Initial Request', () => {
    it('sends userMessage on first iteration', async () => {
      const mockResponseText = `data: {"type":"content_delta","content":"Hello"}\n\ndata: {"type":"done"}\n\n`

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: vi
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode(mockResponseText),
                })
                .mockResolvedValueOnce({ done: true, value: undefined }),
              releaseLock: vi.fn(),
            }),
          },
        } as any)
      )

      const events: any[] = []
      for await (const event of runAgentLoop('http://localhost:3000', 'chat-1', 'Hi')) {
        events.push(event)
        if (events.length > 10) break // Safety
      }

      expect(global.fetch).toHaveBeenCalled()
      const call = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.userMessage).toBe('Hi')
    })
  })

  describe('Content Streaming', () => {
    it('yields content_delta events', async () => {
      const mockResponseText = `data: {"type":"content_delta","delta":"Hello"}\n\ndata: {"type":"done"}\n\n`

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: vi
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode(mockResponseText),
                })
                .mockResolvedValueOnce({ done: true, value: undefined }),
              releaseLock: vi.fn(),
            }),
          },
        } as any)
      )

      const events: any[] = []
      for await (const event of runAgentLoop('http://localhost:3000', 'chat-1', 'Hi')) {
        events.push(event)
        if (events.length > 10) break
      }

      const contentDelta = events.find((e) => e.type === 'content_delta')
      expect(contentDelta).toBeDefined()
      expect(contentDelta.delta).toBe('Hello')
    })
  })

  describe('Tool Execution', () => {
    it('executes tools and yields tool_use_complete', async () => {
      const mockResponseText = `data: {"type":"tool_use","toolUse":{"type":"tool_use","id":"tool_1","name":"take_snapshot","input":{}}}\n\ndata: {"type":"done"}\n\n`

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: vi
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode(mockResponseText),
                })
                .mockResolvedValueOnce({ done: true, value: undefined }),
              releaseLock: vi.fn(),
            }),
          },
        } as any)
      )

      vi.mocked(executeToolViaBackground).mockResolvedValue({
        success: true,
        data: 'Snapshot data',
        durationMs: 100,
      })

      const events: any[] = []
      for await (const event of runAgentLoop('http://localhost:3000', 'chat-1', 'Check')) {
        events.push(event)
        if (events.length > 10) break
      }

      expect(executeToolViaBackground).toHaveBeenCalledWith('take_snapshot', {})

      const toolComplete = events.find((e) => e.type === 'tool_call_complete')
      expect(toolComplete).toBeDefined()
      expect(toolComplete.toolName).toBe('take_snapshot')
    })

    it('handles screenshot result specially', async () => {
      const mockResponseText = `data: {"type":"tool_use","toolUse":{"type":"tool_use","id":"tool_1","name":"take_screenshot","input":{}}}\n\ndata: {"type":"done"}\n\n`

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: vi
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode(mockResponseText),
                })
                .mockResolvedValueOnce({ done: true, value: undefined }),
              releaseLock: vi.fn(),
            }),
          },
        } as any)
      )

      vi.mocked(executeToolViaBackground).mockResolvedValue({
        success: true,
        data: {
          base64: 'iVBORw0KGgo...',
          mimeType: 'image/png',
          width: 1920,
          height: 1080,
        },
        durationMs: 200,
      })

      const events: any[] = []
      for await (const event of runAgentLoop('http://localhost:3000', 'chat-1', 'Screenshot')) {
        events.push(event)
        if (events.length > 10) break
      }

      const toolComplete = events.find((e) => e.type === 'tool_call_complete')
      expect(toolComplete.result).toContain('[Screenshot captured')
      expect(toolComplete.result).toContain('image/png')
      expect(toolComplete.result).not.toContain('iVBORw0KGgo')
    })
  })

  describe('History / Continuation', () => {
    it('includes previousContent + toolResults on the second turn', async () => {
      const turn1 = `data: {"type":"tool_use","toolUse":{"type":"tool_use","id":"tool_1","name":"navigate","input":{"url":"https://example.com"}}}\n\ndata: {"type":"done"}\n\n`
      const turn2 = `data: {"type":"content_delta","delta":"Done"}\n\ndata: {"type":"done"}\n\n`

      const makeStreamResponse = (payload: string) =>
        ({
          ok: true,
          body: {
            getReader: () => ({
              read: vi
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode(payload),
                })
                .mockResolvedValueOnce({ done: true, value: undefined }),
              releaseLock: vi.fn(),
            }),
          },
        } as any)

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(makeStreamResponse(turn1))
        .mockResolvedValueOnce(makeStreamResponse(turn2))

      global.fetch = fetchMock as any

      vi.mocked(executeToolViaBackground).mockResolvedValue({
        success: true,
        data: 'ok',
        durationMs: 1,
      })

      const events: any[] = []
      for await (const event of runAgentLoop('http://localhost:3000', 'chat-1', 'Go')) {
        events.push(event)
        if (events.find((e) => e.type === 'done')) break
      }

      expect(fetchMock).toHaveBeenCalledTimes(2)

      const bodies = (fetchMock as any).mock.calls.map((call: any[]) => JSON.parse(call[1].body))
      const continuation = bodies.find((b: any) => b.previousContent && b.toolResults)
      expect(continuation).toBeDefined()
      expect(continuation.toolResults[0].tool_use_id).toBe('tool_1')
    })
  })

  describe('Error Handling', () => {
    it('yields error event on stream error', async () => {
      const mockResponseText = `data: {"type":"error","error":"Something failed"}\n\n`

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: vi
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode(mockResponseText),
                })
                .mockResolvedValueOnce({ done: true, value: undefined }),
              releaseLock: vi.fn(),
            }),
          },
        } as any)
      )

      const events: any[] = []
      for await (const event of runAgentLoop('http://localhost:3000', 'chat-1', 'Hi')) {
        events.push(event)
        if (events.length > 10) break
      }

      const errorEvent = events.find((e) => e.type === 'error')
      expect(errorEvent).toBeDefined()
      expect(errorEvent.error).toContain('Something failed')
    })

    it('yields error event on HTTP error', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        } as any)
      )

      const events: any[] = []
      for await (const event of runAgentLoop('http://localhost:3000', 'chat-1', 'Hi')) {
        events.push(event)
        if (events.length > 10) break
      }

      const errorEvent = events.find((e) => e.type === 'error')
      expect(errorEvent).toBeDefined()
      expect(errorEvent.error).toBeDefined()
    })
  })

  describe('Authentication', () => {
    it('includes Bearer token in request headers', async () => {
      const mockResponseText = `data: {"type":"done"}\n\n`

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: vi
                .fn()
                .mockResolvedValueOnce({
                  done: false,
                  value: new TextEncoder().encode(mockResponseText),
                })
                .mockResolvedValueOnce({ done: true, value: undefined }),
              releaseLock: vi.fn(),
            }),
          },
        } as any)
      )

      const events: any[] = []
      for await (const event of runAgentLoop('http://localhost:3000', 'chat-1', 'Hi')) {
        events.push(event)
        if (events.length > 10) break
      }

      expect(global.fetch).toHaveBeenCalled()
      const call = (global.fetch as any).mock.calls[0]
      expect(call[1].headers.Authorization).toBe('Bearer mock-token')
    })
  })
})

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
              cancel: vi.fn(() => Promise.resolve()),
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
              cancel: vi.fn(() => Promise.resolve()),
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
              cancel: vi.fn(() => Promise.resolve()),
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
              cancel: vi.fn(() => Promise.resolve()),
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
              cancel: vi.fn(() => Promise.resolve()),
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
              cancel: vi.fn(() => Promise.resolve()),
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

  describe('Cancellation', () => {
    const encoder = new TextEncoder()
    const API = 'http://localhost:3000'

    // A response whose body stays open after the first chunk, like a long generation.
    const openStreamingResponse = () => {
      const cancel = vi.fn()
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"type":"content_delta","delta":"Hel"}\n\n'))
        },
        cancel,
      })
      return { response: new Response(body), cancel }
    }

    const settleWithin = <T,>(promise: Promise<T>, ms: number) =>
      Promise.race([
        promise,
        new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), ms)),
      ])

    it('passes the abort signal to fetch so Stop closes the HTTP request', async () => {
      const { response } = openStreamingResponse()
      const fetchMock = vi.fn((_url: URL, _init?: RequestInit) => Promise.resolve(response))
      vi.stubGlobal('fetch', fetchMock)
      const controller = new AbortController()

      const loop = runAgentLoop(API, 'chat-1', 'Hi', undefined, undefined, controller.signal)
      await loop.next()
      controller.abort()

      expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
      await settleWithin(loop.return(undefined), 200)
    })

    it('cancels the response body when aborted mid-stream instead of hanging on read', async () => {
      const { response, cancel } = openStreamingResponse()
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response)))
      const controller = new AbortController()

      const loop = runAgentLoop(API, 'chat-1', 'Hi', undefined, undefined, controller.signal)
      const first = await loop.next()
      expect(first.value).toMatchObject({ type: 'content_delta', delta: 'Hel' })

      controller.abort()
      const next = await settleWithin(loop.next(), 200)

      expect(next).not.toBe('timeout')
      expect(cancel).toHaveBeenCalled()
    })

    it('does not execute further tools from the same turn once aborted', async () => {
      const payload = [
        '{"type":"tool_use","toolUse":{"type":"tool_use","id":"t1","name":"click","input":{"ref":"a"}}}',
        '{"type":"tool_use","toolUse":{"type":"tool_use","id":"t2","name":"click","input":{"ref":"b"}}}',
        '{"type":"done"}',
      ]
        .map((line) => `data: ${line}\n\n`)
        .join('')
      const fetchMock = vi.fn(() => Promise.resolve(new Response(payload)))
      vi.stubGlobal('fetch', fetchMock)
      const controller = new AbortController()
      vi.mocked(executeToolViaBackground).mockImplementation(async () => {
        controller.abort()
        return { success: true, data: 'clicked', durationMs: 1 }
      })

      const events = []
      for await (const event of runAgentLoop(API, 'chat-1', 'Go', undefined, undefined, controller.signal)) {
        events.push(event)
      }

      expect(executeToolViaBackground).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error codes', () => {
    const API = 'http://localhost:3000'

    const collect = async () => {
      const events = []
      for await (const event of runAgentLoop(API, 'chat-1', 'Hi')) events.push(event)
      return events
    }

    it('keeps code and pricingUrl for 402 INSUFFICIENT_BALANCE', async () => {
      const body = JSON.stringify({
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_BALANCE',
        details: { pricingUrl: '/pricing' },
      })
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(body, { status: 402 }))))

      const events = await collect()

      expect(events).toContainEqual({
        type: 'error',
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_BALANCE',
        details: { pricingUrl: '/pricing' },
      })
    })

    it('keeps code and Retry-After for a 429 concurrency limit, without retrying', async () => {
      const body = JSON.stringify({
        error: 'Another request is still running',
        code: 'CONCURRENT_REQUEST_LIMIT',
      })
      const fetchMock = vi.fn(() =>
        Promise.resolve(new Response(body, { status: 429, headers: { 'Retry-After': '5' } }))
      )
      vi.stubGlobal('fetch', fetchMock)

      const events = await collect()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'error',
          code: 'CONCURRENT_REQUEST_LIMIT',
          details: expect.objectContaining({ retryAfter: 5 }),
        })
      )
    })

    it('keeps code and details for an error sent inside the stream', async () => {
      const line = JSON.stringify({
        type: 'error',
        error: 'AI service is temporarily busy.',
        code: 'ANTHROPIC_RATE_LIMIT',
        details: { retryAfter: 60 },
      })
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(`data: ${line}\n\n`))))

      const events = await collect()

      expect(events).toContainEqual({
        type: 'error',
        error: 'AI service is temporarily busy.',
        code: 'ANTHROPIC_RATE_LIMIT',
        details: { retryAfter: 60 },
      })
    })
  })

  describe('Truncation', () => {
    const collectFrom = async (payload: string[]) => {
      const body = payload.map((line) => `data: ${line}\n\n`).join('')
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(body))))
      const events = []
      for await (const event of runAgentLoop('http://localhost:3000', 'chat-1', 'Hi')) events.push(event)
      return events
    }

    it('flags a final answer that stopped on max_tokens', async () => {
      const events = await collectFrom([
        '{"type":"content_delta","delta":"The answer is"}',
        '{"type":"execution_complete","stopReason":"max_tokens"}',
        '{"type":"done","stopReason":"max_tokens"}',
      ])

      expect(events).toContainEqual({ type: 'output_truncated' })
    })

    it('does not flag a normal end_turn answer', async () => {
      const events = await collectFrom(['{"type":"done","stopReason":"end_turn"}'])

      expect(events.map((e) => e.type)).not.toContain('output_truncated')
    })
  })
})

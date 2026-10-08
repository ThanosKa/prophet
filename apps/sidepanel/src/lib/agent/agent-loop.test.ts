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

const API = 'http://localhost:3000'

/** An SSE body with one `data:` frame per event. */
const sse = (events: unknown[]) => events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('')

const requestBodies = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)))

/** Answers each request with the next Turn's events, in order. */
function serveTurns(turns: unknown[][]) {
  const fetchMock = vi.fn()
  for (const turn of turns) fetchMock.mockResolvedValueOnce(new Response(sse(turn)))
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, bodies: () => requestBodies(fetchMock) }
}

/** Answers every request with the same Turn (a fresh Response each time: a body reads once). */
function serveEveryTurn(turn: unknown[]) {
  const fetchMock = vi.fn(() => Promise.resolve(new Response(sse(turn))))
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, bodies: () => requestBodies(fetchMock) }
}

async function collect(options: Partial<Parameters<typeof runAgentLoop>[0]> = {}) {
  const events = []
  for await (const event of runAgentLoop({ baseUrl: API, chatId: 'chat-1', userMessage: 'Hi', ...options })) {
    events.push(event)
  }
  return events
}

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
      for await (const event of runAgentLoop({ baseUrl: API, chatId: 'chat-1', userMessage: 'Hi' })) {
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
      for await (const event of runAgentLoop({ baseUrl: API, chatId: 'chat-1', userMessage: 'Hi' })) {
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
      for await (const event of runAgentLoop({ baseUrl: API, chatId: 'chat-1', userMessage: 'Check' })) {
        events.push(event)
        if (events.length > 10) break
      }

      expect(executeToolViaBackground).toHaveBeenCalledWith('take_snapshot', {})

      const toolComplete = events.find((e) => e.type === 'tool_call_complete')
      expect(toolComplete).toBeDefined()
      expect(toolComplete.toolName).toBe('take_snapshot')
    })

  })

  describe('Tool input check', () => {
    it("doesn't run a tool call whose input breaks its schema, and names each invalid field to Claude", async () => {
      const badScroll = { type: 'tool_use', id: 't1', name: 'scroll_page', input: { direction: 'sideways', pixels: 'lots' } }
      const { fetchMock, bodies } = serveTurns([
        [{ type: 'tool_use', toolUse: badScroll }, { type: 'done', stopReason: 'tool_use' }],
        [{ type: 'content_delta', delta: 'Scrolling down instead.' }, { type: 'done', stopReason: 'end_turn' }],
      ])

      const events = await collect()

      expect(executeToolViaBackground).not.toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalledTimes(2)
      const [result] = bodies()[1].previousTurns[0].toolResults
      expect(result).toMatchObject({ type: 'tool_result', tool_use_id: 't1', is_error: true })
      expect(result.content).toContain('direction')
      expect(result.content).toContain('pixels')
      expect(events).toContainEqual(expect.objectContaining({ type: 'tool_call_error', toolCallId: 't1' }))
    })

    it('runs a valid tool call with the schema defaults filled in', async () => {
      serveTurns([
        [{ type: 'tool_use', toolUse: { type: 'tool_use', id: 't1', name: 'scroll_page', input: { direction: 'down' } } }, { type: 'done', stopReason: 'tool_use' }],
        [{ type: 'done', stopReason: 'end_turn' }],
      ])
      vi.mocked(executeToolViaBackground).mockResolvedValue({ success: true, data: 'Scrolled', durationMs: 1 })

      await collect()

      expect(executeToolViaBackground).toHaveBeenCalledWith('scroll_page', { direction: 'down', pixels: 500 })
    })
  })

  describe('Run id', () => {
    const runId = '5f0c6f9e-2b7a-4c1e-9d3a-8e2f1b6c4a70'
    const snapshotTurn = (id: string) => [
      { type: 'tool_use', toolUse: { type: 'tool_use', id, name: 'take_snapshot', input: {} } },
      { type: 'done', stopReason: 'tool_use' },
    ]

    beforeEach(() => {
      vi.mocked(executeToolViaBackground).mockResolvedValue({ success: true, data: 'uid=1 button "Send"', durationMs: 1 })
    })

    it('sends the runId from session_created on every continuation, even when a later frame lacks it', async () => {
      const { bodies } = serveTurns([
        [{ type: 'session_created', sessionId: 'chat-1', runId }, ...snapshotTurn('t1')],
        [{ type: 'session_created', sessionId: 'chat-1' }, ...snapshotTurn('t2')],
        [{ type: 'session_created', sessionId: 'chat-1', runId }, { type: 'done', stopReason: 'end_turn' }],
      ])

      await collect()

      expect(bodies().map((body) => body.runId)).toEqual([undefined, runId, runId])
    })

    it('ends the Run with a notice when the chat continued in another panel', async () => {
      const superseded = 'This chat continued in another panel, so this task stopped here.'
      const { fetchMock } = serveTurns([[{ type: 'session_created', sessionId: 'chat-1', runId }, ...snapshotTurn('t1')]])
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: superseded, code: 'RUN_SUPERSEDED' }), { status: 409 })
      )

      const events = await collect()

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(events.map((event) => event.type)).not.toContain('error')
      expect(events.at(-1)).toEqual({ type: 'run_notice', reason: 'superseded', message: superseded })
    })
  })

  describe('History / Continuation', () => {
    it('includes the first turn and its tool results on the second turn', async () => {
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
      for await (const event of runAgentLoop({ baseUrl: API, chatId: 'chat-1', userMessage: 'Go' })) {
        events.push(event)
        if (events.find((e) => e.type === 'done')) break
      }

      expect(fetchMock).toHaveBeenCalledTimes(2)

      const bodies = (fetchMock as any).mock.calls.map((call: any[]) => JSON.parse(call[1].body))
      const continuation = bodies.find((b: any) => b.previousTurns)
      expect(continuation).toBeDefined()
      expect(continuation.previousTurns[0].toolResults[0].tool_use_id).toBe('tool_1')
    })
  })

  describe('Silent stops', () => {

    it('sends an is_error tool_result for a tool that threw, so the next turn stays valid', async () => {
      const { fetchMock, bodies } = serveTurns([
        [{ type: 'tool_use', toolUse: { type: 'tool_use', id: 't1', name: 'click', input: { ref: 'a' } } }, { type: 'done' }],
        [{ type: 'content_delta', delta: 'ok' }, { type: 'done' }],
      ])
      vi.mocked(executeToolViaBackground).mockRejectedValue(new Error('Could not establish connection'))

      const events = await collect()

      expect(events).toContainEqual(expect.objectContaining({ type: 'tool_call_error', toolCallId: 't1' }))
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(bodies()[1].previousTurns[0].toolResults).toEqual([
        {
          type: 'tool_result',
          tool_use_id: 't1',
          content: expect.stringContaining('Could not establish connection'),
          is_error: true,
        },
      ])
    })

    it('pauses after exactly 20 Turns and says so', async () => {
      const { fetchMock } = serveEveryTurn([
        { type: 'tool_use', toolUse: { type: 'tool_use', id: 't1', name: 'scroll', input: {} } },
        { type: 'done', stopReason: 'tool_use' },
      ])
      vi.mocked(executeToolViaBackground).mockResolvedValue({ success: true, data: 'ok', durationMs: 1 })

      const events = await collect()

      expect(fetchMock).toHaveBeenCalledTimes(20)
      expect(events.at(-1)).toEqual({
        type: 'turn_limit_reached',
        message: 'Prophet paused after 20 turns. Send "continue" to keep going.',
      })
    })

    it('reports a stream that ends without done or error as an unexpected stop', async () => {
      serveEveryTurn([{ type: 'content_delta', delta: 'Half an ans' }])

      const events = await collect()

      expect(events.at(-1)).toEqual({ type: 'error', error: 'The response stopped unexpectedly. Please try again.' })
    })

    it('does not start another turn when a tool turn was cut before done', async () => {
      const { fetchMock } = serveEveryTurn([{ type: 'tool_use', toolUse: { type: 'tool_use', id: 't1', name: 'click', input: {} } }])
      vi.mocked(executeToolViaBackground).mockResolvedValue({ success: true, data: 'ok', durationMs: 1 })

      const events = await collect()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(events.at(-1)).toEqual({ type: 'error', error: 'The response stopped unexpectedly. Please try again.' })
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
      for await (const event of runAgentLoop({ baseUrl: API, chatId: 'chat-1', userMessage: 'Hi' })) {
        events.push(event)
        if (events.length > 10) break
      }

      const errorEvent = events.find((e) => e.type === 'error')
      expect(errorEvent).toBeDefined()
      expect(errorEvent.error).toContain('Something failed')
    })

    it('yields error event on HTTP error', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({ error: 'Server error' }), { status: 500 }))
      )

      const events: any[] = []
      for await (const event of runAgentLoop({ baseUrl: API, chatId: 'chat-1', userMessage: 'Hi' })) {
        events.push(event)
        if (events.length > 10) break
      }

      const errorEvent = events.find((e) => e.type === 'error')
      expect(errorEvent).toBeDefined()
      expect(errorEvent.error).toBe('Server error')
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
      for await (const event of runAgentLoop({ baseUrl: API, chatId: 'chat-1', userMessage: 'Hi' })) {
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

      const loop = runAgentLoop({ baseUrl: API, chatId: 'chat-1', userMessage: 'Hi', signal: controller.signal })
      await loop.next()
      controller.abort()

      expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true)
      await settleWithin(loop.return(undefined), 200)
    })

    it('cancels the response body when aborted mid-stream instead of hanging on read', async () => {
      const { response, cancel } = openStreamingResponse()
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response)))
      const controller = new AbortController()

      const loop = runAgentLoop({ baseUrl: API, chatId: 'chat-1', userMessage: 'Hi', signal: controller.signal })
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
      for await (const event of runAgentLoop({ baseUrl: API, chatId: 'chat-1', userMessage: 'Go', signal: controller.signal })) {
        events.push(event)
      }

      expect(executeToolViaBackground).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error codes', () => {
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

    it('keeps code and a Retry-After countdown for a 409 BALANCE_HELD', async () => {
      const body = JSON.stringify({
        error: 'Your balance is held by another request. Try again in a few seconds.',
        code: 'BALANCE_HELD',
      })
      vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve(new Response(body, { status: 409, headers: { 'Retry-After': '5' } })))
      )

      const events = await collect()

      expect(events).toContainEqual({
        type: 'error',
        error: 'Your balance is held by another request. Try again in a few seconds.',
        code: 'BALANCE_HELD',
        details: { retryAfter: 5 },
      })
    })

    it('keeps the 402 hints that offer cheaper options', async () => {
      const details = {
        pricingUrl: '/pricing',
        isContinuation: true,
        suggestedModel: 'claude-haiku-5-5',
        suggestDisableThinking: true,
        canUpgrade: false,
      }
      const body = JSON.stringify({ error: 'Not enough credits for Opus.', code: 'INSUFFICIENT_BALANCE', details })
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(body, { status: 402 }))))

      const events = await collect()

      expect(events).toContainEqual({
        type: 'error',
        error: 'Not enough credits for Opus.',
        code: 'INSUFFICIENT_BALANCE',
        details,
      })
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

  describe('User-facing error texts', () => {
    it('explains a 413 without a JSON body as an image that is too large', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('Request Entity Too Large', { status: 413 }))))

      const events = await collect()

      expect(events).toContainEqual(
        expect.objectContaining({ type: 'error', error: 'That image is too large to send. Try a smaller one.' })
      )
    })

    it('explains a 5xx without a JSON body as the server not responding', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('<html>Bad Gateway</html>', { status: 502 }))))

      const events = await collect()

      expect(events).toContainEqual(
        expect.objectContaining({ type: 'error', error: "Prophet's server didn't respond. Please try again." })
      )
    })

    it('explains an OK response without a body as the server not responding', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 200 }))))

      const events = await collect()

      expect(events).toContainEqual(
        expect.objectContaining({ type: 'error', error: "Prophet's server didn't respond. Please try again." })
      )
    })

    it('replaces a stream error without text by a generic retry message', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('data: {"type":"error"}\n\n'))))

      const events = await collect()

      expect(events).toContainEqual(
        expect.objectContaining({ type: 'error', error: 'Something went wrong. Please try again.' })
      )
    })

    it("shows the server's own error text when the body has one", async () => {
      const body = JSON.stringify({ error: 'Please sign in again.', code: 'UNAUTHORIZED' })
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(body, { status: 401 }))))

      const events = await collect()

      expect(events).toContainEqual(expect.objectContaining({ type: 'error', error: 'Please sign in again.' }))
    })
  })

  describe('Truncation', () => {
    const collectFrom = async (turn: unknown[]) => {
      serveEveryTurn(turn)
      return collect()
    }

    it('flags a final answer that stopped on max_tokens', async () => {
      const events = await collectFrom([
        { type: 'content_delta', delta: 'The answer is' },
        { type: 'execution_complete', stopReason: 'max_tokens' },
        { type: 'done', stopReason: 'max_tokens' },
      ])

      expect(events).toContainEqual({ type: 'output_truncated', reducedForBalance: false })
    })

    it('says when the cut came from max_tokens being lowered for a low balance', async () => {
      const events = await collectFrom([
        { type: 'content_delta', delta: 'The answer is' },
        { type: 'done', stopReason: 'max_tokens', maxTokensReducedForBalance: true },
      ])

      expect(events).toContainEqual({ type: 'output_truncated', reducedForBalance: true })
    })

    it('does not flag a normal end_turn answer', async () => {
      const events = await collectFrom([{ type: 'done', stopReason: 'end_turn' }])

      expect(events.map((e) => e.type)).not.toContain('output_truncated')
    })
  })

  describe('Append-only run history (prompt caching)', () => {
    const navigate = { type: 'tool_use', id: 't1', name: 'navigate', input: { url: 'https://mail.google.com/' } }
    const snapshot = { type: 'tool_use', id: 't2', name: 'take_snapshot', input: {} }

    const run = (options: Partial<Parameters<typeof runAgentLoop>[0]> = {}) =>
      collect({ userMessage: 'Find the March invoice', ...options })

    beforeEach(() => {
      vi.mocked(executeToolViaBackground)
        .mockResolvedValueOnce({ success: true, data: 'Navigated to Inbox', durationMs: 1 })
        .mockResolvedValueOnce({ success: true, data: 'uid=1 link "Invoice March"', durationMs: 1 })
    })

    it('resends every earlier turn of the run, oldest first, on each continuation', async () => {
      const { bodies } = serveTurns([
        [{ type: 'content_delta', delta: 'Opening your inbox.' }, { type: 'tool_use', toolUse: navigate }, { type: 'done', stopReason: 'tool_use' }],
        [{ type: 'tool_use', toolUse: snapshot }, { type: 'done', stopReason: 'tool_use' }],
        [{ type: 'content_delta', delta: 'Found it.' }, { type: 'done', stopReason: 'end_turn' }],
      ])

      await run()

      const navigateTurn = {
        content: [{ type: 'text', text: 'Opening your inbox.' }, navigate],
        toolResults: [{ type: 'tool_result', tool_use_id: 't1', content: 'Navigated to Inbox', is_error: false }],
      }
      const snapshotTurn = {
        content: [snapshot],
        toolResults: [{ type: 'tool_result', tool_use_id: 't2', content: 'uid=1 link "Invoice March"', is_error: false }],
      }
      expect(bodies()[1].previousTurns).toEqual([navigateTurn])
      expect(bodies()[2].previousTurns).toEqual([navigateTurn, snapshotTurn])
    })

    it("keeps the user's Thinking choice on every request of the run", async () => {
      const { bodies } = serveTurns([
        [{ type: 'tool_use', toolUse: navigate }, { type: 'done', stopReason: 'tool_use' }],
        [{ type: 'content_delta', delta: 'Done.' }, { type: 'done', stopReason: 'end_turn' }],
      ])

      await run({ model: 'claude-sonnet-5-5', enableThinking: true })

      expect(bodies().map((body) => body.enableThinking)).toEqual([true, true])
    })

    it("replays the server's own content blocks, signed thinking included, as the turn", async () => {
      const contentBlocks = [
        { type: 'thinking', thinking: 'The inbox is one click away.', signature: 'sig-abc' },
        { type: 'text', text: 'Opening your inbox.', citations: null },
        navigate,
      ]
      const { bodies } = serveTurns([
        [
          { type: 'thinking_delta', delta: 'The inbox is one click away.' },
          { type: 'content_delta', delta: 'Opening your inbox.' },
          { type: 'tool_use', toolUse: navigate },
          { type: 'done', stopReason: 'tool_use', contentBlocks },
        ],
        [{ type: 'content_delta', delta: 'Done.' }, { type: 'done', stopReason: 'end_turn' }],
      ])

      await run({ model: 'claude-sonnet-5-5', enableThinking: true })

      expect(bodies()[1].previousTurns[0].content).toEqual(contentBlocks)
    })

    it('resends the attached image with every request of the run', async () => {
      const image = { base64: 'iVBORw0KGgo=', mediaType: 'image/png' as const }
      const { bodies } = serveTurns([
        [{ type: 'tool_use', toolUse: navigate }, { type: 'done', stopReason: 'tool_use' }],
        [{ type: 'content_delta', delta: 'Done.' }, { type: 'done', stopReason: 'end_turn' }],
      ])

      await run({ model: 'claude-sonnet-5-5', image })

      expect(bodies().map((body) => body.image)).toEqual([image, image])
    })
  })
})

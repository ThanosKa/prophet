import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIError } from '@anthropic-ai/sdk'
import {
  anthropicTurn,
  text,
  textBlockEvents,
  toolUse,
  toolUseBlockEvents,
} from '@/app/api/agent/chat/anthropic-stream-stubs'
import { calculateWebSearchCostInCredits } from '@/lib/pricing'
import {
  closingFrames,
  describeTurnError,
  readTurnStream,
  releasedToolCalls,
  type FinishedTurn,
} from './turn-stream'

const loggerMock = vi.hoisted(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }))
vi.mock('@/lib/logger', () => ({ logger: loggerMock }))

beforeEach(() => {
  vi.clearAllMocks()
})

const SESSION = { type: 'session_created', sessionId: 'chat_1', runId: 'run_1' } as const

async function readTurn(stream: object) {
  const sent: unknown[] = []
  const result = await readTurnStream({
    open: vi.fn().mockResolvedValue(stream),
    sessionFrame: SESSION,
    model: 'claude-haiku-5-5',
    send: (frame) => {
      sent.push(frame)
    },
  })
  return { sent, result }
}

const STUB_USAGE = {
  inputTokens: 1000,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
  outputTokens: 50,
}
const STUB_METRICS = { type: 'metrics_update', metrics: { ...STUB_USAGE, costCents: 1 } }

describe('readTurnStream', () => {
  it('sends session_created, the text and the metrics, and returns the finished Turn', async () => {
    const { sent, result } = await readTurn(
      anthropicTurn({ content: [text('Hello there')], stopReason: 'end_turn' })
    )

    expect(sent).toEqual([SESSION, { type: 'content_delta', delta: 'Hello there' }, STUB_METRICS])
    expect(result).toEqual({
      ended: 'finished',
      final: {
        stopReason: 'end_turn',
        usage: { ...STUB_USAGE, webSearchRequests: 0 },
        text: 'Hello there',
        clientToolCalls: [],
        echoableContent: [{ type: 'text', text: 'Hello there' }],
        citations: [],
        refusalCategory: null,
        runContinues: false,
      },
      partial: {
        usageReported: true,
        usage: { ...STUB_USAGE, webSearchRequests: 0 },
        streamedOutput: 'Hello there',
        text: 'Hello there',
      },
    })
  })

  it('sends thinking as it streams, outside the reply text', async () => {
    const thinking = { type: 'thinking', thinking: 'The user wants a greeting.', signature: 'sig' }
    const { sent, result } = await readTurn(
      anthropicTurn({
        events: [
          { type: 'content_block_start', index: 0, content_block: { ...thinking, thinking: '' } },
          { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: thinking.thinking } },
          { type: 'content_block_stop', index: 0 },
          ...textBlockEvents({ index: 1, value: 'Hi!' }),
        ],
        content: [thinking, text('Hi!')],
        stopReason: 'end_turn',
      })
    )

    expect(sent).toEqual([
      SESSION,
      { type: 'thinking_delta', delta: 'The user wants a greeting.' },
      { type: 'content_delta', delta: 'Hi!' },
      STUB_METRICS,
    ])
    expect(result.partial).toMatchObject({ streamedOutput: 'The user wants a greeting.Hi!', text: 'Hi!' })
    expect(result.ended === 'finished' && result.final.text).toBe('Hi!')
  })

  it('sends web search start and results as they happen, and prices metrics from the started search', async () => {
    const search = { type: 'server_tool_use', id: 'srvtoolu_1', name: 'web_search', input: { query: 'prophet chrome' } }
    const searchResult = {
      type: 'web_search_tool_result',
      tool_use_id: 'srvtoolu_1',
      content: [
        { type: 'web_search_result', url: 'https://a.com', title: 'A', page_age: '1 day', encrypted_content: 'enc-a' },
        { type: 'web_search_result', url: 'https://b.com', title: 'B', page_age: null, encrypted_content: 'enc-b' },
      ],
    }
    const answer = {
      type: 'text',
      text: 'Prophet is a side panel agent.',
      citations: [
        {
          type: 'web_search_result_location',
          url: 'https://a.com',
          title: 'A',
          cited_text: 'a side panel agent',
          encrypted_index: 'idx',
        },
      ],
    }
    const { sent, result } = await readTurn(
      anthropicTurn({
        events: [
          { type: 'content_block_start', index: 0, content_block: { ...search, input: {} } },
          {
            type: 'content_block_delta',
            index: 0,
            delta: { type: 'input_json_delta', partial_json: '{"query":"prophet chrome"}' },
          },
          { type: 'content_block_stop', index: 0 },
          { type: 'content_block_start', index: 1, content_block: searchResult },
          { type: 'content_block_stop', index: 1 },
          ...textBlockEvents({ index: 2, value: 'Prophet is a side panel agent.' }),
        ],
        content: [search, searchResult, answer],
        stopReason: 'end_turn',
      })
    )

    expect(sent).toEqual([
      SESSION,
      { type: 'web_search_start', toolUseId: 'srvtoolu_1', query: 'prophet chrome' },
      {
        type: 'web_search_results',
        toolUseId: 'srvtoolu_1',
        sources: [
          { url: 'https://a.com', title: 'A', pageAge: '1 day' },
          { url: 'https://b.com', title: 'B', pageAge: null },
        ],
      },
      { type: 'content_delta', delta: 'Prophet is a side panel agent.' },
      { type: 'metrics_update', metrics: { ...STUB_USAGE, costCents: 2 } },
    ])
    expect(result.ended === 'finished' && result.final.citations).toEqual([
      { url: 'https://a.com', title: 'A', citedText: 'a side panel agent' },
    ])
  })

  it('sends a web search error frame for a failed search', async () => {
    const failed = {
      type: 'web_search_tool_result',
      tool_use_id: 'srvtoolu_1',
      content: { type: 'web_search_tool_result_error', error_code: 'max_uses_exceeded' },
    }
    const { sent } = await readTurn(
      anthropicTurn({
        events: [
          { type: 'content_block_start', index: 0, content_block: failed },
          { type: 'content_block_stop', index: 0 },
        ],
        content: [failed],
        stopReason: 'end_turn',
      })
    )

    expect(sent).toContainEqual({
      type: 'web_search_error',
      toolUseId: 'srvtoolu_1',
      errorCode: 'max_uses_exceeded',
    })
  })

  it('holds client tool calls back until the Turn ends', async () => {
    const navigate = toolUse({ id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' } })
    const { sent, result } = await readTurn(
      anthropicTurn({ content: [text('Opening a.com'), navigate], stopReason: 'tool_use' })
    )

    expect(sent).toEqual([SESSION, { type: 'content_delta', delta: 'Opening a.com' }, STUB_METRICS])
    expect(result).toMatchObject({
      ended: 'finished',
      final: {
        stopReason: 'tool_use',
        clientToolCalls: [{ type: 'tool_use', id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' } }],
        runContinues: true,
      },
    })
  })

  it('turns unparseable tool JSON into an empty input and warns', async () => {
    const { result } = await readTurn(
      anthropicTurn({
        events: toolUseBlockEvents({ index: 0, id: 'toolu_1', name: 'navigate', partialJson: '{"url": "https://a.' }),
        content: [toolUse({ id: 'toolu_1', name: 'navigate', input: {} })],
        stopReason: 'tool_use',
      })
    )

    expect(result.ended === 'finished' && result.final.clientToolCalls).toEqual([
      { type: 'tool_use', id: 'toolu_1', name: 'navigate', input: {} },
    ])
    expect(loggerMock.warn).toHaveBeenCalledWith(
      { toolUseId: 'toolu_1', input: '{"url": "https://a.', error: expect.any(String) },
      'Failed to parse tool input, using empty object'
    )
  })

  it('finishes a pause_turn Turn as one the Run goes on from', async () => {
    const { result } = await readTurn(
      anthropicTurn({ content: [text('Still searching')], stopReason: 'pause_turn' })
    )

    expect(result).toMatchObject({ ended: 'finished', final: { stopReason: 'pause_turn', runContinues: true } })
  })

  it('carries the refusal category of a refused Turn', async () => {
    const { result } = await readTurn(anthropicTurn({ content: [text('Sure')], stopReason: 'refusal' }))

    expect(result).toMatchObject({
      ended: 'finished',
      final: { stopReason: 'refusal', refusalCategory: 'cyber', runContinues: false },
    })
  })

  it('bills the web searches Anthropic reports, and leaves the started ones for a partial bill', async () => {
    const search = (id: string) => ({ type: 'server_tool_use', id, name: 'web_search', input: { query: id } })
    const turn = anthropicTurn({
      content: [search('srvtoolu_1'), search('srvtoolu_2'), text('Found it')],
      stopReason: 'end_turn',
    })
    const { result } = await readTurn({
      ...turn,
      finalMessage: async () => ({
        ...(await turn.finalMessage()),
        usage: { input_tokens: 1000, output_tokens: 50, server_tool_use: { web_search_requests: 1 } },
      }),
    })

    expect(result.ended === 'finished' && result.final.usage.webSearchRequests).toBe(1)
    expect(result.partial.usage.webSearchRequests).toBe(2)
  })

  it('sends nothing and reports no usage when the stream never opens', async () => {
    const failure = new Error('529 overloaded_error')
    const sent: unknown[] = []
    const result = await readTurnStream({
      open: () => Promise.reject(failure),
      sessionFrame: SESSION,
      model: 'claude-haiku-5-5',
      send: (frame) => {
        sent.push(frame)
      },
    })

    expect(sent).toEqual([])
    expect(result).toEqual({
      ended: 'cut_short',
      error: failure,
      partial: {
        usageReported: false,
        usage: { inputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0, outputTokens: 0, webSearchRequests: 0 },
        streamedOutput: '',
        text: '',
      },
    })
  })

  it('cuts short before message_start with no usage reported', async () => {
    const stop = new Error('Request was aborted.')
    const { sent, result } = await readTurn(cutOffStream({ events: [], error: stop }))

    expect(sent).toEqual([SESSION])
    expect(result).toMatchObject({ ended: 'cut_short', error: stop, partial: { usageReported: false } })
  })

  it('cuts short after message_start with the usage and output measured so far', async () => {
    const stop = new Error('Request was aborted.')
    const { sent, result } = await readTurn(
      cutOffStream({
        events: [
          {
            type: 'message_start',
            message: {
              usage: { input_tokens: 1000, output_tokens: 1, cache_creation_input_tokens: 200, cache_read_input_tokens: 300 },
            },
          },
          ...textBlockEvents({ index: 0, value: 'Opening ' }),
          { type: 'content_block_start', index: 1, content_block: { type: 'server_tool_use', id: 'srvtoolu_1', name: 'web_search', input: {} } },
          { type: 'content_block_stop', index: 1 },
          { type: 'content_block_start', index: 2, content_block: { type: 'tool_use', id: 'toolu_1', name: 'navigate', input: {} } },
          { type: 'content_block_delta', index: 2, delta: { type: 'input_json_delta', partial_json: '{"url":' } },
        ],
        error: stop,
      })
    )

    expect(sent).toEqual([
      SESSION,
      { type: 'content_delta', delta: 'Opening ' },
      { type: 'web_search_start', toolUseId: 'srvtoolu_1', query: '' },
    ])
    expect(result).toEqual({
      ended: 'cut_short',
      error: stop,
      partial: {
        usageReported: true,
        usage: {
          inputTokens: 1000,
          cacheCreationInputTokens: 200,
          cacheReadInputTokens: 300,
          outputTokens: 0,
          webSearchRequests: 1,
        },
        streamedOutput: 'Opening {"url":',
        text: 'Opening ',
      },
    })
  })

  it('cuts short with the streamed usage when the final message fails', async () => {
    const failure = new Error('stream ended without a message')
    const turn = anthropicTurn({ content: [text('Done')], stopReason: 'end_turn' })
    const { result } = await readTurn({ ...turn, finalMessage: () => Promise.reject(failure) })

    expect(result).toEqual({
      ended: 'cut_short',
      error: failure,
      partial: {
        usageReported: true,
        usage: { ...STUB_USAGE, webSearchRequests: 0 },
        streamedOutput: 'Done',
        text: 'Done',
      },
    })
  })
})

function cutOffStream({ events, error }: { events: Record<string, unknown>[]; error: Error }) {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield* events
      throw error
    },
    finalMessage: () => Promise.reject(new Error('no final message after a cut-off stream')),
  }
}

function anthropicBadRequest(message: string) {
  return APIError.generate(
    400,
    { type: 'error', error: { type: 'invalid_request_error', message } },
    undefined,
    new Headers()
  )
}

describe('describeTurnError', () => {
  it.each([
    [
      'prompt is too long: 210000 tokens > 200000 maximum',
      'This chat is too long for the model. Start a new chat to continue.',
      'CONTEXT_TOO_LONG',
    ],
    [
      'messages.0.content.1.image.source.base64: image exceeds 5 MB maximum',
      'That image is too large or unsupported. Try a smaller image.',
      'IMAGE_INVALID',
    ],
    [
      'messages: roles must alternate',
      "Claude couldn't process this request. Start a new chat and try again.",
      'ANTHROPIC_INVALID_REQUEST',
    ],
  ])('words an invalid request (%s)', (message, error, code) => {
    expect(describeTurnError(anthropicBadRequest(message))).toEqual({ type: 'error', error, code })
  })

  it('asks for a minute on an Anthropic rate limit that says to try again later', () => {
    expect(describeTurnError(new Error('429 rate_limit_error: please try again later'))).toEqual({
      type: 'error',
      error: 'AI service is temporarily busy. Please wait a moment and try again.',
      code: 'ANTHROPIC_RATE_LIMIT',
      details: { retryAfter: 60 },
    })
  })

  it('leaves the retry out of a rate limit that names no wait', () => {
    expect(JSON.stringify(describeTurnError(new Error('429 {"type":"rate_limit_error"}')))).toBe(
      '{"type":"error","error":"AI service is temporarily busy. Please wait a moment and try again.","code":"ANTHROPIC_RATE_LIMIT"}'
    )
  })

  it.each([
    ['529 overloaded_error', 'AI service is experiencing high demand. Please try again in a few minutes.', 'ANTHROPIC_OVERLOADED'],
    ['401 authentication_error: invalid x-api-key', 'Service configuration error. Please contact support.', 'ANTHROPIC_AUTH_ERROR'],
    ['socket hang up', 'Something went wrong. Please try again.', 'STREAMING_ERROR'],
  ])('classifies %s', (message, error, code) => {
    expect(describeTurnError(new Error(message))).toEqual({ type: 'error', error, code })
  })

  it('sends only the generic text for a value that is not an Error', () => {
    expect(JSON.stringify(describeTurnError('stream ended'))).toBe(
      '{"type":"error","error":"Something went wrong. Please try again."}'
    )
  })
})

const CALL = { type: 'tool_use', id: 'toolu_1', name: 'click', input: { selector: '#a' } } as const

function finished(overrides: Partial<FinishedTurn> = {}): FinishedTurn {
  return {
    stopReason: 'end_turn',
    usage: { ...STUB_USAGE, webSearchRequests: 0 },
    text: 'Done',
    clientToolCalls: [],
    echoableContent: [{ type: 'text', text: 'Done' }],
    citations: [],
    refusalCategory: null,
    runContinues: false,
    ...overrides,
  }
}

const frames = (final: FinishedTurn, extra: Partial<Parameters<typeof closingFrames>[0]> = {}) =>
  closingFrames({ final, costCents: 1, runEnd: null, maxTokensReducedForBalance: false, ...extra })

describe('closingFrames', () => {
  it('gives a refused Turn only the error frame', () => {
    const result = frames(finished({ stopReason: 'refusal', clientToolCalls: [CALL] }))

    expect(result).toEqual([
      {
        type: 'error',
        error: 'Claude declined this request. Try rephrasing it or start a new chat.',
        code: 'MODEL_REFUSED',
      },
    ])
  })

  it('sends the tool calls, then citations, then execution_complete, then done on tool_use', () => {
    const citations = [{ url: 'https://a.test', title: 'A', citedText: 'a' }]
    const result = frames(
      finished({
        stopReason: 'tool_use',
        clientToolCalls: [CALL],
        citations,
        echoableContent: [CALL],
        runContinues: true,
      })
    )

    expect(result.map((f) => f.type)).toEqual(['tool_use', 'citations', 'execution_complete', 'done'])
    expect(result[0]).toEqual({ type: 'tool_use', toolUse: CALL })
    expect(result[1]).toEqual({ type: 'citations', citations })
  })

  it('releases no tool call on the last Turn of a Run, and says why on done', () => {
    const result = frames(finished({ stopReason: 'tool_use', clientToolCalls: [CALL] }), {
      runEnd: 'turn_limit',
    })

    expect(result.map((f) => f.type)).toEqual(['execution_complete', 'done'])
    expect(result[1]).toMatchObject({ type: 'done', runEnd: 'turn_limit' })
    expect(releasedToolCalls({ final: finished({ stopReason: 'tool_use', clientToolCalls: [CALL] }), runEnd: 'turn_limit' })).toEqual([])
  })

  it('releases no tool call on max_tokens and drops the cut-off call from contentBlocks', () => {
    const result = frames(
      finished({
        stopReason: 'max_tokens',
        clientToolCalls: [CALL],
        echoableContent: [{ type: 'text', text: 'Part' }, CALL],
      })
    )

    expect(result.map((f) => f.type)).toEqual(['execution_complete', 'done'])
    expect(result[1]).toMatchObject({ contentBlocks: [{ type: 'text', text: 'Part' }] })
  })

  it('keeps tool_use blocks in contentBlocks on a tool_use stop', () => {
    const result = frames(
      finished({ stopReason: 'tool_use', clientToolCalls: [CALL], echoableContent: [CALL] })
    )

    expect(result.at(-1)).toMatchObject({ contentBlocks: [CALL] })
  })

  it('sends citations only when there are some', () => {
    expect(frames(finished()).map((f) => f.type)).toEqual(['execution_complete', 'done'])
  })

  it('leaves runEnd out of done unless the Run ends', () => {
    const [, done] = frames(finished())

    expect(JSON.stringify(done)).not.toContain('runEnd')
  })

  it('reports usage with the web searches, and the balance reduction', () => {
    const result = frames(
      finished({ usage: { ...STUB_USAGE, cacheReadInputTokens: 200, webSearchRequests: 2 } }),
      { costCents: 7, maxTokensReducedForBalance: true }
    )
    const usage = {
      inputTokens: 1200,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 200,
      outputTokens: 50,
      costCents: 7,
      webSearchRequests: 2,
      webSearchCostCents: calculateWebSearchCostInCredits(2),
    }

    expect(result[0]).toEqual({
      type: 'execution_complete',
      stopReason: 'end_turn',
      finalOutput: 'Done',
      metrics: usage,
    })
    expect(result[1]).toMatchObject({ type: 'done', usage, maxTokensReducedForBalance: true })
  })
})

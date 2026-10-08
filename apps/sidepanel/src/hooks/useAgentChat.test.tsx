import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { AgentRunEvent } from '@/lib/agent/agent-loop'

vi.mock('@/lib/agent', () => ({ runAgentLoop: vi.fn() }))
vi.mock('@/lib/config', () => ({
  config: { apiUrl: 'http://localhost:3000', useDevApi: false, useMockApi: false },
}))

vi.stubGlobal('chrome', {
  runtime: { id: 'test-extension', sendMessage: vi.fn(() => Promise.resolve()) },
  storage: { local: { get: vi.fn(() => Promise.resolve({})), set: vi.fn(() => Promise.resolve()) } },
  tabs: {
    query: vi.fn(() => Promise.resolve([{ id: 1 }])),
    sendMessage: vi.fn(() => Promise.resolve()),
    onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
    onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
  },
})
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

const { runAgentLoop } = await import('@/lib/agent')
const { useAgentChat } = await import('./useAgentChat')
const { useChatStore } = await import('@/store/chatStore')
const { useAgentStore } = await import('@/store/agentStore')
const { useUIStore } = await import('@/store/uiStore')

function deferred() {
  let resolve = () => {}
  const promise = new Promise<void>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

interface FakeRun {
  signal: AbortSignal | undefined
  release: () => void
}

// Each runAgentLoop call emits `before`, parks until released (a tool or stream still in flight), then emits `after`.
function scriptRuns(script: Array<{ before: AgentRunEvent[]; after: AgentRunEvent[] }>) {
  const runs: FakeRun[] = []
  vi.mocked(runAgentLoop).mockImplementation(async function* (_url, _chatId, _message, _model, _image, signal) {
    const step = script[runs.length]
    const gate = deferred()
    runs.push({ signal, release: gate.resolve })
    yield* step.before
    await gate.promise
    yield* step.after
  })
  return runs
}

describe('useAgentChat run isolation', () => {
  let root: Root
  let hook: ReturnType<typeof useAgentChat> | undefined

  function Harness({ onRender }: { onRender: (value: ReturnType<typeof useAgentChat>) => void }) {
    const value = useAgentChat()
    useEffect(() => onRender(value))
    return null
  }

  const current = () => {
    if (!hook) throw new Error('hook not rendered')
    return hook
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    useChatStore.setState({ messages: {}, isStreaming: false })
    useAgentStore.getState().reset()
    root = createRoot(document.createElement('div'))
    await act(async () =>
      root.render(
        <Harness
          onRender={(value) => {
            hook = value
          }}
        />
      )
    )
  })

  afterEach(async () => {
    await act(async () => root.unmount())
  })

  it('a stopped run that finishes late cannot abort or end the newer run', async () => {
    const runs = scriptRuns([
      {
        before: [{ type: 'tool_call_start', toolName: 'click_element_by_uid', params: {}, toolCallId: 't1' }],
        after: [{ type: 'content_delta', delta: 'stale' }],
      },
      {
        before: [{ type: 'content_delta', delta: 'fresh' }],
        after: [{ type: 'done' }],
      },
    ])

    await act(async () => {
      void current().sendMessage('chat-1', 'first')
    })
    await act(async () => current().abort())
    await act(async () => {
      void current().sendMessage('chat-1', 'second')
    })

    await act(async () => runs[0].release())

    expect(runs[0].signal?.aborted).toBe(true)
    expect(runs[1].signal?.aborted).toBe(false)
    expect(useChatStore.getState().isStreaming).toBe(true)
    expect(useAgentStore.getState().isActive).toBe(true)
    const contents = (useChatStore.getState().messages['chat-1'] ?? []).map((m) => m.content)
    expect(contents).not.toContain('freshstale')

    await act(async () => runs[1].release())
    expect(useChatStore.getState().isStreaming).toBe(false)
  })

  it('surfaces error code and retryAfter so ChatView can pick the right banner', async () => {
    const runs = scriptRuns([
      {
        before: [
          {
            type: 'error',
            error: 'Another request is still running',
            code: 'CONCURRENT_REQUEST_LIMIT',
            details: { retryAfter: 5, remaining: 0 },
          },
        ],
        after: [],
      },
    ])

    await act(async () => {
      void current().sendMessage('chat-1', 'hi')
    })
    await act(async () => runs[0].release())

    expect(current().errorInfo?.code).toBe('CONCURRENT_REQUEST_LIMIT')
    expect(current().retryAfter).toBe(5)
    expect(runAgentLoop).toHaveBeenCalledTimes(1)
  })

  it('shows a neutral notice, not an error, when the final answer was cut off at max_tokens', async () => {
    const runs = scriptRuns([
      {
        before: [{ type: 'content_delta', delta: 'The answer is' }],
        after: [{ type: 'output_truncated', reducedForBalance: false }, { type: 'done' }],
      },
    ])

    await act(async () => {
      void current().sendMessage('chat-1', 'hi')
    })
    await act(async () => runs[0].release())

    expect(current().notice).toBe('This answer hit the length limit and was cut short. Send "continue" for the rest.')
    expect(current().error).toBeNull()
    expect(useChatStore.getState().isStreaming).toBe(false)
  })

  it('blames the low balance when the server shrank max_tokens to fit it', async () => {
    const runs = scriptRuns([
      { before: [], after: [{ type: 'output_truncated', reducedForBalance: true }, { type: 'done' }] },
    ])

    await act(async () => {
      void current().sendMessage('chat-1', 'hi')
    })
    await act(async () => runs[0].release())

    expect(current().notice).toBe(
      'This answer was cut short because your balance is low. Buy credits or switch to Haiku 5.5 for full-length answers.'
    )
  })

  it("shows the latest request's whole prompt as the chat context, not the sum of every turn", async () => {
    useUIStore.getState().resetContextTokens()
    const runs = scriptRuns([
      {
        before: [
          {
            type: 'metrics_update',
            metrics: { inputTokens: 40_000, cacheReadInputTokens: 36_000, outputTokens: 300 },
          },
          {
            type: 'metrics_update',
            metrics: { inputTokens: 45_000, cacheReadInputTokens: 40_000, outputTokens: 200 },
          },
        ],
        after: [{ type: 'done' }],
      },
    ])

    await act(async () => {
      void current().sendMessage('chat-1', 'hi')
    })
    await act(async () => runs[0].release())

    expect(useUIStore.getState()).toMatchObject({
      contextTokens: 45_200,
      contextInputTokens: 45_000,
      contextCachedInputTokens: 40_000,
      contextOutputTokens: 200,
    })
  })

  it('shows a neutral notice when the run pauses at the step cap', async () => {
    const runs = scriptRuns([{ before: [], after: [{ type: 'turn_limit_reached' }] }])

    await act(async () => {
      void current().sendMessage('chat-1', 'hi')
    })
    await act(async () => runs[0].release())

    expect(current().notice).toBe('Prophet paused after 10 steps. Send "continue" to keep going.')
    expect(current().error).toBeNull()
  })

  it.each([
    [new TypeError('Failed to fetch'), "Can't reach Prophet. Check your connection and try again."],
    [new TypeError('NetworkError when attempting to fetch resource.'), "Can't reach Prophet. Check your connection and try again."],
    [new Error('net::ERR_INTERNET_DISCONNECTED network error'), "Can't reach Prophet. Check your connection and try again."],
    [
      new Error('Could not establish connection. Receiving end does not exist.'),
      'Prophet lost its connection to the browser. Reopen the side panel and try again.',
    ],
    [new Error('Extension context invalidated.'), 'Prophet lost its connection to the browser. Reopen the side panel and try again.'],
    [new Error('Cannot read properties of undefined (reading "x")'), 'Something went wrong. Please try again.'],
  ])('shows a plain-language error when the run throws %s', async (thrown, expected) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(runAgentLoop).mockImplementation(async function* () {
      yield* []
      throw thrown
    })

    await act(async () => {
      await current().sendMessage('chat-1', 'hi')
    })

    expect(current().error).toBe(expected)
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), thrown)
    consoleError.mockRestore()
  })

  it('falls back to a generic retry message for an error event without text', async () => {
    const runs = scriptRuns([{ before: [{ type: 'error', error: '' }], after: [] }])

    await act(async () => {
      void current().sendMessage('chat-1', 'hi')
    })
    await act(async () => runs[0].release())

    expect(current().error).toBe('Something went wrong. Please try again.')
  })

  it('passes the 402 hints through so the banner can offer Haiku, Thinking off, and hide Upgrade', async () => {
    const runs = scriptRuns([
      {
        before: [
          {
            type: 'error',
            error: 'Not enough credits for Opus.',
            code: 'INSUFFICIENT_BALANCE',
            details: {
              pricingUrl: '/pricing',
              isContinuation: false,
              suggestedModel: 'claude-haiku-5-5',
              suggestDisableThinking: true,
              canUpgrade: false,
            },
          },
        ],
        after: [],
      },
    ])

    await act(async () => {
      void current().sendMessage('chat-1', 'hi')
    })
    await act(async () => runs[0].release())

    expect(current().error).toBe('Not enough credits for Opus.')
    expect(current().errorInfo).toEqual({
      code: 'INSUFFICIENT_BALANCE',
      pricingUrl: '/pricing',
      suggestedModel: 'claude-haiku-5-5',
      suggestDisableThinking: true,
      canUpgrade: false,
    })
  })

  it('shows an error only in the banner, never as words in the assistant message', async () => {
    const runs = scriptRuns([
      {
        before: [{ type: 'content_delta', delta: 'Partial answer' }],
        after: [{ type: 'error', error: 'AI service is temporarily busy.' }],
      },
    ])

    await act(async () => {
      void current().sendMessage('chat-1', 'hi')
    })
    await act(async () => runs[0].release())

    const assistant = (useChatStore.getState().messages['chat-1'] ?? []).find((m) => m.role === 'assistant')
    expect(current().error).toBe('AI service is temporarily busy.')
    expect(assistant?.content).toBe('Partial answer')
    expect(JSON.stringify(assistant?.parts)).not.toContain('temporarily busy')
  })

  it('clears the error banner and notice when the user switches to another chat', async () => {
    const runs = scriptRuns([{ before: [{ type: 'error', error: 'Not enough credits.', code: 'INSUFFICIENT_BALANCE' }], after: [] }])
    await act(async () => {
      void current().sendMessage('chat-1', 'hi')
    })
    await act(async () => runs[0].release())
    expect(current().error).toBe('Not enough credits.')

    await act(async () => useChatStore.getState().setActiveChatId('chat-2'))

    expect(current().error).toBeNull()
    expect(current().errorInfo).toBeNull()
    expect(current().notice).toBeNull()
  })
})

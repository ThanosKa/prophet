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

  it('shows a notice when the final answer was cut off at max_tokens', async () => {
    const runs = scriptRuns([
      {
        before: [{ type: 'content_delta', delta: 'The answer is' }],
        after: [{ type: 'output_truncated' }, { type: 'done' }],
      },
    ])

    await act(async () => {
      void current().sendMessage('chat-1', 'hi')
    })
    await act(async () => runs[0].release())

    expect(current().error).toMatch(/cut off/)
    expect(current().errorInfo?.code).toBe('OUTPUT_TRUNCATED')
    expect(useChatStore.getState().isStreaming).toBe(false)
  })
})

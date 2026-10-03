import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/lib/agent', () => ({ runAgentLoop: vi.fn() }))
vi.mock('@/lib/config', () => ({
  config: { apiUrl: 'http://localhost:3000', useDevApi: false, useMockApi: false },
}))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isSignedIn: true, user: { creditsRemaining: 100 } }),
}))
vi.mock('@/components/auth/SignInButton', () => ({ SignInButton: () => null }))

const listener = () => ({ addListener: vi.fn(), removeListener: vi.fn() })
vi.stubGlobal('chrome', {
  runtime: { id: 'test-extension', sendMessage: vi.fn(() => Promise.resolve({ token: 't' })), onMessage: listener() },
  storage: {
    local: { get: vi.fn(() => Promise.resolve({})), set: vi.fn(() => Promise.resolve()), onChanged: listener() },
  },
  tabs: {
    query: vi.fn(() => Promise.resolve([{ id: 1 }])),
    sendMessage: vi.fn(() => Promise.resolve()),
    onUpdated: listener(),
    onActivated: listener(),
  },
})
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

const { default: App } = await import('./App')
const { runAgentLoop } = await import('@/lib/agent')
const { useChatStore } = await import('@/store/chatStore')

async function waitFor<T>({ what, find }: { what: string; find: () => T | null | undefined }): Promise<T> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const found = find()
    if (found) return found
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)))
  }
  throw new Error(`timed out waiting for ${what}`)
}

function typeInto(textarea: HTMLTextAreaElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  setValue?.call(textarea, value)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('App sending the first message of a new chat', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    vi.clearAllMocks()
    useChatStore.setState({ activeChatId: null, chats: [], messages: {}, isStreaming: false })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  it('keeps the draft and shows why when the chat cannot be created', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: URL, init?: RequestInit) => {
        if (init?.method === 'POST') return Promise.reject(new TypeError('Failed to fetch'))
        return Promise.resolve(new Response(JSON.stringify({ data: { chats: [], hasMore: false } })))
      })
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    await act(async () =>
      root.render(
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      )
    )

    const textarea = await waitFor({ what: 'the chat input', find: () => container.querySelector('textarea') })
    await act(async () => typeInto(textarea, 'Summarize this page'))
    await act(async () => {
      textarea.closest('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })

    const alert = await waitFor({ what: 'the error banner', find: () => container.querySelector('[role="alert"]') })
    expect(alert.textContent).toContain(
      "Can't reach Prophet. Check your connection and try again."
    )
    expect(container.querySelector('textarea')?.value).toBe('Summarize this page')
    expect(runAgentLoop).not.toHaveBeenCalled()
  })
})

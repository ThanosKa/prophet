import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EnhancedMessageList } from './EnhancedMessageList'

vi.mock('@/lib/config', () => ({
  config: { apiUrl: 'http://localhost:3000', useDevApi: false, useMockApi: false },
}))

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

type Messages = ComponentProps<typeof EnhancedMessageList>['messages']

const userMessage = {
  id: 'm1',
  chatId: 'c1',
  role: 'user',
  content: 'Buy my cart',
  createdAt: new Date('2026-10-08T10:00:00Z'),
} satisfies Messages[number]

describe('EnhancedMessageList tool calls', () => {
  let container: HTMLDivElement
  let root: Root

  const render = async (messages: Messages) => {
    await act(async () => root.render(<EnhancedMessageList messages={messages} />))
  }

  /** The collapsed tool-call rows, by their visible label. */
  const toolRows = () =>
    Array.from(container.querySelectorAll('button')).filter((button) =>
      button.querySelector('.font-medium')
    )
  const rowLabelled = (label: string) =>
    toolRows().find((button) => button.querySelector('.font-medium')?.textContent === label)

  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  it("shows a reloaded reply's stored tool calls under it, marking the failed one", async () => {
    await render([
      userMessage,
      {
        id: 'm2',
        chatId: 'c1',
        role: 'assistant',
        content: 'Your cart is checked out.',
        createdAt: new Date('2026-10-08T10:00:05Z'),
        toolCalls: [
          { type: 'tool_use', id: 't1', name: 'navigate', input: { url: 'https://shop.example/cart' } },
          { type: 'tool_use', id: 't2', name: 'click_element_by_uid', input: { uid: 'a1' }, isError: true },
        ],
      },
    ])

    expect(container.textContent).toContain('Your cart is checked out.')
    expect(toolRows()).toHaveLength(2)
    expect(rowLabelled('Navigate')?.textContent).not.toContain('Failed')
    expect(rowLabelled('Click')?.textContent).toContain('Failed')
    // Under the reply
    const reply = Array.from(container.querySelectorAll('p')).find((p) =>
      p.textContent?.includes('Your cart is checked out.')
    )
    const firstRow = rowLabelled('Navigate')
    if (!reply || !firstRow) throw new Error('reply or tool row missing')
    expect(reply.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('skips stored tool calls that fail the stored-tool-call schema and keeps the rest', async () => {
    await render([
      userMessage,
      {
        id: 'm2',
        chatId: 'c1',
        role: 'assistant',
        content: 'Done.',
        createdAt: new Date('2026-10-08T10:00:05Z'),
        toolCalls: [
          { type: 'tool_use', id: 't1', name: 'take_snapshot', input: {} },
          { id: 't2', name: 'navigate' },
          'not a call',
        ],
      },
    ])

    expect(toolRows()).toHaveLength(1)
    expect(rowLabelled('Snapshot')).toBeDefined()
  })

  it('shows a stored call to a tool this build does not know by its name', async () => {
    await render([
      userMessage,
      {
        id: 'm2',
        chatId: 'c1',
        role: 'assistant',
        content: 'Done.',
        createdAt: new Date('2026-10-08T10:00:05Z'),
        toolCalls: [{ type: 'tool_use', id: 't1', name: 'read_pdf', input: {} }],
      },
    ])

    expect(rowLabelled('read_pdf')).toBeDefined()
  })

  it('marks a failed tool call in the live parts view', async () => {
    await render([
      userMessage,
      {
        id: 'm2',
        chatId: 'c1',
        role: 'assistant',
        content: 'I could not click it.',
        createdAt: new Date('2026-10-08T10:00:05Z'),
        parts: [
          { type: 'tool', toolCallId: 't1', toolName: 'navigate', state: 'completed', input: { url: 'https://shop.example' } },
          {
            type: 'tool',
            toolCallId: 't2',
            toolName: 'click_element_by_uid',
            state: 'error',
            input: { uid: 'a1' },
            error: 'Element not found',
          },
          { type: 'text', text: 'I could not click it.' },
        ],
      },
    ])

    expect(rowLabelled('Navigate')?.textContent).not.toContain('Failed')
    expect(rowLabelled('Click')?.textContent).toContain('Failed')
  })
})

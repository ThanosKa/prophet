import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ChatBanner } from './ChatBanner'
import { useUIStore } from '@/store/uiStore'

vi.mock('@/lib/config', () => ({
  config: { apiUrl: 'http://localhost:3000', useDevApi: false, useMockApi: false },
}))

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

describe('ChatBanner', () => {
  let container: HTMLDivElement
  let root: Root

  const render = async (props: ComponentProps<typeof ChatBanner>) => {
    await act(async () => root.render(<ChatBanner {...props} />))
  }

  const buttonNamed = (name: string) =>
    Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === name)

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    useUIStore.setState({ selectedModel: 'claude-opus-5-5', enableThinking: true })
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  it('renders a truncation notice as a neutral status, not an alert', async () => {
    const notice = 'This answer hit the length limit and was cut short. Send "continue" for the rest.'
    await render({ notice })

    const status = container.querySelector('[role="status"]')
    expect(status?.textContent).toContain(notice)
    expect(status?.className).not.toMatch(/destructive/)
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('announces errors with role="alert"', async () => {
    await render({ error: 'Please sign in again.' })

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Please sign in again.')
  })

  it('shows a balance hold as a countdown alert without buy or upgrade buttons', async () => {
    await render({
      error: 'Your balance is held by another request. Try again in a few seconds.',
      errorInfo: { code: 'BALANCE_HELD' },
      retryAfter: 5,
    })

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Try again in a few seconds.')
    expect(container.textContent).toContain('5 seconds')
    expect(buttonNamed('Buy Extra Credits')).toBeUndefined()
    expect(buttonNamed('Upgrade your plan')).toBeUndefined()
  })

  it('offers a one-click switch to the suggested cheaper model on a 402', async () => {
    const onDismissError = vi.fn()
    await render({
      error: 'Not enough credits for Opus.',
      errorInfo: { code: 'INSUFFICIENT_BALANCE', suggestedModel: 'claude-haiku-4-5' },
      onDismissError,
    })

    await act(async () => buttonNamed('Switch to Haiku 4.5')?.click())

    expect(useUIStore.getState().selectedModel).toBe('claude-haiku-4-5')
    expect(onDismissError).toHaveBeenCalled()
  })

  it('offers to turn off Thinking when the server suggests it', async () => {
    await render({
      error: 'Not enough credits with Thinking on.',
      errorInfo: { code: 'INSUFFICIENT_BALANCE', suggestDisableThinking: true },
    })

    await act(async () => buttonNamed('Turn off Thinking')?.click())

    expect(useUIStore.getState().enableThinking).toBe(false)
  })

  it('hides Upgrade when the user cannot upgrade, but keeps Buy', async () => {
    await render({
      error: 'Not enough credits.',
      errorInfo: { code: 'INSUFFICIENT_BALANCE', canUpgrade: false },
    })

    expect(buttonNamed('Buy Extra Credits')).toBeDefined()
    expect(buttonNamed('Upgrade your plan')).toBeUndefined()
  })

  it('keeps Buy and Upgrade for an older server that sends no hints', async () => {
    await render({ error: 'Insufficient credits', errorInfo: { code: 'INSUFFICIENT_BALANCE' } })

    expect(buttonNamed('Buy Extra Credits')).toBeDefined()
    expect(buttonNamed('Upgrade your plan')).toBeDefined()
    expect(buttonNamed('Switch to Haiku 4.5')).toBeUndefined()
    expect(buttonNamed('Turn off Thinking')).toBeUndefined()
  })
})

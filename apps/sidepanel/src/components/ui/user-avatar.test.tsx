import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { User } from '@prophet/shared'

const auth = vi.hoisted(() => {
  const state: { user: Pick<User, 'creditsRemaining' | 'purchasedCredits'> | null } = { user: null }
  return state
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ clerkUser: { firstName: 'Ada', lastName: 'Lovelace' }, user: auth.user }),
}))
vi.mock('@/lib/config', () => ({ config: { apiUrl: 'http://localhost:3000' } }))
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

const { UserAvatar } = await import('./user-avatar')

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  document.body.innerHTML = ''
})

async function openMenu() {
  await act(async () => root.render(<UserAvatar />))
  const trigger = container.querySelector('[aria-haspopup="menu"]')
  if (!trigger) throw new Error('menu trigger not rendered')
  await act(async () => {
    trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
  })
  return document.body.textContent ?? ''
}

describe('UserAvatar balance', () => {
  it('shows the total and the share that never expires', async () => {
    auth.user = { creditsRemaining: 1300, purchasedCredits: 1000 }

    const text = await openMenu()

    expect(text).toContain('Balance: $13')
    expect(text).toContain('Includes $10 that never expires')
  })

  it('shows only the total without Purchased credits', async () => {
    auth.user = { creditsRemaining: 7, purchasedCredits: 0 }

    const text = await openMenu()

    expect(text).toContain('Balance: $0.07')
    expect(text).not.toContain('never expires')
  })
})

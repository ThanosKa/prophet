import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EnhancedChatInput, type OnSend } from './EnhancedChatInput'

vi.mock('@/lib/config', () => ({
  config: { apiUrl: 'http://localhost:3000', useDevApi: false, useMockApi: false },
}))

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

describe('EnhancedChatInput image attach', () => {
  let container: HTMLDivElement
  let root: Root
  let onSend: ReturnType<typeof vi.fn<OnSend>>

  const render = async () => {
    await act(async () => root.render(<EnhancedChatInput onSend={onSend} />))
  }

  const attach = async (file: File) => {
    const input = container.querySelector('input[type="file"]')
    if (!(input instanceof HTMLInputElement)) throw new Error('no file input')
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))
  }

  const submit = async () => {
    const form = container.querySelector('form')
    if (!form) throw new Error('no form')
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    // FileReader resolves on a later task
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)))
  }

  const imageOfBytes = ({ bytes, type }: { bytes: number; type: string }) =>
    new File([new Uint8Array(bytes)], 'shot.png', { type })

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    onSend = vi.fn<OnSend>()
    // jsdom has no object URLs
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:shot'), revokeObjectURL: vi.fn() })
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
  })

  it('refuses an image over 2,000,000 base64 chars when it is attached, with a message', async () => {
    await render()

    // 1,600,000 bytes encode to 2,133,336 base64 chars
    await attach(imageOfBytes({ bytes: 1_600_000, type: 'image/png' }))

    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(/too large/i)
    expect(container.querySelector('img[alt="shot.png"]')).toBeNull()
    await submit()
    expect(onSend).not.toHaveBeenCalled()
  })

  it('refuses a file whose media type is not a supported image, with a message', async () => {
    await render()

    await attach(imageOfBytes({ bytes: 1_000, type: 'image/bmp' }))

    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(/JPEG, PNG, GIF or WebP/)
    expect(container.querySelector('img[alt="shot.png"]')).toBeNull()
  })

  it('sends an image within the limit with its validated media type', async () => {
    await render()

    // 1,400,000 bytes encode to 1,866,668 base64 chars
    await attach(imageOfBytes({ bytes: 1_400_000, type: 'image/webp' }))
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(container.querySelector('img[alt="shot.png"]')).not.toBeNull()

    await submit()

    expect(onSend).toHaveBeenCalledTimes(1)
    const [, image] = onSend.mock.calls[0]
    expect(image?.mediaType).toBe('image/webp')
    expect(image?.base64.length).toBe(1_866_668)
  })

  it('clears the refusal once a valid image is attached', async () => {
    await render()

    await attach(imageOfBytes({ bytes: 1_600_000, type: 'image/png' }))
    await attach(imageOfBytes({ bytes: 1_000, type: 'image/png' }))

    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(container.querySelector('img[alt="shot.png"]')).not.toBeNull()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { NextFetchEvent } from 'next/dist/server/web/spec-extension/fetch-event'

vi.mock('@clerk/nextjs/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@clerk/nextjs/server')>()
  return {
    ...actual,
    // Runs the app's handler with a signed-out session, without Clerk's handshake.
    clerkMiddleware:
      (handler: (auth: () => Promise<{ userId: null }>, req: NextRequest) => unknown) =>
      (req: NextRequest) =>
        handler(() => Promise.resolve({ userId: null }), req),
  }
})

const { default: proxy } = await import('./proxy')

describe('proxy (Clerk middleware)', () => {
  it('answers signed-out API calls with a sign-in-again message the extension can show as is', async () => {
    const request = new NextRequest('http://localhost:3000/api/agent/chat', { method: 'POST' })

    const response = await proxy(request, new NextFetchEvent({ request, page: '/', context: undefined }))

    expect(response?.status).toBe(401)
    expect(await response?.json()).toEqual({
      error: 'Your session has expired. Please sign out and sign in again.',
      code: 'UNAUTHORIZED',
    })
  })
})

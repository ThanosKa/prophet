import { describe, expect, it, vi } from 'vitest'
import { currentRequestDb, keepRequestOpenUntil, serveWithRequestDb } from './request-scope'
import type { Database, RequestClient } from './client'

/**
 * A stand-in for one request's database client. Only its identity and whether it was
 * closed matter here; the real client is exercised by the burst on a local Worker.
 */
function fakeClient(): RequestClient & { closed: boolean } {
  const client = {
    db: Object.create(null) satisfies Database,
    closed: false,
    close: async () => {
      client.closed = true
    },
  }
  return client
}

function fakeContext() {
  const pending: Promise<unknown>[] = []
  return {
    ctx: { waitUntil: (promise: Promise<unknown>) => void pending.push(promise) },
    /** Resolves once everything handed to `waitUntil` has finished. */
    finished: () => Promise.all(pending),
  }
}

describe('serveWithRequestDb', () => {
  it('gives each concurrent request its own client', async () => {
    const opened = [fakeClient(), fakeClient()]
    const open = vi.fn(() => opened[open.mock.calls.length - 1])
    const { ctx } = fakeContext()
    let release = () => {}
    const bothStarted = new Promise<void>((resolve) => {
      release = resolve
    })
    const seen: unknown[] = []

    const request = () =>
      serveWithRequestDb({
        ctx,
        openClient: open,
        handle: async () => {
          const before = currentRequestDb()
          if (seen.push(before) === 2) release()
          await bothStarted
          // Still this request's client after the other request ran in between.
          expect(currentRequestDb()).toBe(before)
          return new Response('ok')
        },
      })

    await Promise.all([request(), request()])

    expect(new Set(seen).size).toBe(2)
    expect(open).toHaveBeenCalledTimes(2)
  })

  it('keeps the client open while the body streams, and closes it after the last chunk', async () => {
    const client = fakeClient()
    const { ctx, finished } = fakeContext()
    const encoder = new TextEncoder()
    let source: ReadableStreamDefaultController<Uint8Array> | undefined
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        source = controller
      },
    })

    const response = await serveWithRequestDb({
      ctx,
      openClient: () => client,
      handle: async () => {
        currentRequestDb()
        return new Response(body, { status: 201, headers: { 'Content-Type': 'text/event-stream' } })
      },
    })
    expect(response.status).toBe(201)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')

    const reader = response.body!.getReader()
    source!.enqueue(encoder.encode('first'))
    // The first chunk arrives while the stream is still open: nothing waits for the end.
    expect(new TextDecoder().decode((await reader.read()).value)).toBe('first')
    expect(client.closed).toBe(false)

    source!.close()
    expect((await reader.read()).done).toBe(true)
    await finished()
    expect(client.closed).toBe(true)
  })

  it.each(['application/json', 'text/plain', 'application/xml', 'image/jpeg'])(
    'hands back a finished %s response unchanged, so it keeps its Content-Length',
    async (contentType) => {
      const { ctx } = fakeContext()
      const finishedResponse = new Response('body', { headers: { 'Content-Type': contentType } })

      const response = await serveWithRequestDb({
        ctx,
        openClient: fakeClient,
        handle: async () => finishedResponse,
      })

      expect(response).toBe(finishedResponse)
    }
  )

  it.each(['text/event-stream', 'text/html; charset=utf-8', 'text/x-component'])(
    'follows a %s body to its end, because rendering can still reach the database',
    async (contentType) => {
      const client = fakeClient()
      const { ctx, finished } = fakeContext()

      const response = await serveWithRequestDb({
        ctx,
        openClient: () => client,
        handle: async () => {
          currentRequestDb()
          return new Response('body', { headers: { 'Content-Type': contentType } })
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(client.closed).toBe(false)

      await response.text()
      await finished()
      expect(client.closed).toBe(true)
    }
  )

  it('leaves the client open for a Hold released after the client hung up', async () => {
    const client = fakeClient()
    const { ctx, finished } = fakeContext()
    let releaseHold = () => {}
    const holdReleased = new Promise<void>((resolve) => {
      releaseHold = resolve
    })

    const response = await serveWithRequestDb({
      ctx,
      openClient: () => client,
      handle: async () => {
        currentRequestDb()
        keepRequestOpenUntil(holdReleased)
        return new Response(new ReadableStream(), { headers: { 'Content-Type': 'text/event-stream' } })
      },
    })

    await response.body!.cancel()
    // Give a wrongly eager close every chance to run before the Hold is released.
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(client.closed).toBe(false)

    releaseHold()
    await finished()
    expect(client.closed).toBe(true)
  })

  it('closes the client and passes the error on when the handler throws', async () => {
    const client = fakeClient()
    const { ctx, finished } = fakeContext()

    await expect(
      serveWithRequestDb({
        ctx,
        openClient: () => client,
        handle: async () => {
          currentRequestDb()
          throw new Error('render failed')
        },
      })
    ).rejects.toThrow('render failed')

    await finished()
    expect(client.closed).toBe(true)
  })

  it('never opens a client for a request that does not touch the database', async () => {
    const open = vi.fn(fakeClient)
    const { ctx, finished } = fakeContext()

    const response = await serveWithRequestDb({
      ctx,
      openClient: open,
      handle: async () => new Response('page'),
    })

    expect(await response.text()).toBe('page')
    await finished()
    expect(open).not.toHaveBeenCalled()
  })

  it('refuses to open a client after the request has ended, so none can leak', async () => {
    const open = vi.fn(fakeClient)
    const { ctx, finished } = fakeContext()
    let openGate = () => {}
    const gate = new Promise<void>((resolve) => {
      openGate = resolve
    })
    let forgottenWork: Promise<unknown> = Promise.resolve()

    await serveWithRequestDb({
      ctx,
      openClient: open,
      handle: async () => {
        // Work the handler started and did not wait for or declare.
        forgottenWork = gate.then(() => currentRequestDb())
        return new Response(null, { status: 204 })
      },
    })
    await finished()
    openGate()

    await expect(forgottenWork).rejects.toThrow('after its request ended')
    expect(open).not.toHaveBeenCalled()
  })
})

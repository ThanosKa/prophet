import { afterEach, describe, expect, it, vi } from 'vitest'

async function workerLogger() {
  vi.stubGlobal('navigator', { userAgent: 'Cloudflare-Workers' })
  vi.resetModules()
  const { logger } = await import('./logger')
  return logger
}

function consoleSpies() {
  return {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  }
}

describe('logger on the Workers runtime', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('writes each log call to the console as one JSON line', async () => {
    const consoleOut = consoleSpies()
    const logger = await workerLogger()

    logger.info({ userId: 'user_1' }, 'Turn finished')

    expect(consoleOut.log).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(consoleOut.log.mock.calls[0][0]))).toMatchObject({
      level: 'info',
      userId: 'user_1',
      msg: 'Turn finished',
    })
  })

  it('files errors at console error level and warnings at warn level, where Workers Logs can filter them', async () => {
    const consoleOut = consoleSpies()
    const logger = await workerLogger()

    logger.error({ userId: 'user_1' }, 'Failed to settle credit reservation; hold kept')
    logger.fatal('Worker cannot start')
    logger.warn('Rate limit exceeded for agent chat')

    expect(consoleOut.error.mock.calls.map(([line]) => JSON.parse(String(line)).msg)).toEqual([
      'Failed to settle credit reservation; hold kept',
      'Worker cannot start',
    ])
    expect(consoleOut.warn.mock.calls.map(([line]) => JSON.parse(String(line)).msg)).toEqual([
      'Rate limit exceeded for agent chat',
    ])
    expect(consoleOut.log).not.toHaveBeenCalled()
  })
})

describe('logger', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('keeps the message and stack of an Error logged under `error`', async () => {
    const consoleOut = consoleSpies()
    const logger = await workerLogger()

    logger.error({ error: new Error('No signatures found matching the expected signature') }, 'Webhook signature verification failed')

    const line = JSON.parse(String(consoleOut.error.mock.calls[0][0]))
    expect(line.error).toMatchObject({
      type: 'Error',
      message: 'No signatures found matching the expected signature',
    })
    expect(line.error.stack).toContain('No signatures found')
  })

  it('leaves a string logged under `error` as it is', async () => {
    const consoleOut = consoleSpies()
    const logger = await workerLogger()

    logger.error({ error: 'connection refused' }, 'Agent streaming error')

    expect(JSON.parse(String(consoleOut.error.mock.calls[0][0])).error).toBe('connection refused')
  })
})

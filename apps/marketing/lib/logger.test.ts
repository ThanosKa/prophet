import { afterEach, describe, expect, it, vi } from 'vitest'

describe('logger on the Workers runtime', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('writes each log call to the console as one JSON line', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Cloudflare-Workers' })
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.resetModules()

    const { logger } = await import('./logger')
    logger.info({ userId: 'user_1' }, 'Turn finished')

    expect(consoleLog).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(consoleLog.mock.calls[0][0]))).toMatchObject({
      level: 'info',
      userId: 'user_1',
      msg: 'Turn finished',
    })
  })
})

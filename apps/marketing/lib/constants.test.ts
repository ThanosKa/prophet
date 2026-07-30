import { describe, expect, it, vi, afterEach } from 'vitest'
import { BASE_URL, getAppUrl } from './constants'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getAppUrl', () => {
  it('strips a trailing slash so interpolated paths stay single-slashed', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://prophetchrome.com/')
    expect(getAppUrl()).toBe('https://prophetchrome.com')
    expect(`${getAppUrl()}/account`).toBe('https://prophetchrome.com/account')
  })

  it('strips repeated trailing slashes', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://prophetchrome.com///')
    expect(getAppUrl()).toBe('https://prophetchrome.com')
  })

  it('leaves a clean url untouched', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
    expect(getAppUrl()).toBe('http://localhost:3000')
  })

  it('preserves a base path while dropping its trailing slash', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://prophetchrome.com/app/')
    expect(getAppUrl()).toBe('https://prophetchrome.com/app')
  })

  it('falls back to BASE_URL when unset or blank', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    expect(getAppUrl()).toBe(BASE_URL)

    vi.stubEnv('NEXT_PUBLIC_APP_URL', '   ')
    expect(getAppUrl()).toBe(BASE_URL)
  })
})

import { describe, expect, it } from 'vitest'
import { shouldReloadForSessionCookie } from './clerk-session-cookie'

const syncHostname = 'clerk.prophetchrome.com'

function change({
  value = '1794152319',
  name = '__client_uat',
  domain = '.prophetchrome.com',
  removed = false,
  cause = 'explicit',
}: {
  value?: string
  name?: string
  domain?: string
  removed?: boolean
  cause?: chrome.cookies.CookieChangeInfo['cause']
} = {}): chrome.cookies.CookieChangeInfo {
  return {
    removed,
    cause,
    cookie: {
      name,
      value,
      domain,
      path: '/',
      secure: true,
      httpOnly: false,
      sameSite: 'lax',
      hostOnly: false,
      session: false,
      storeId: '0',
    },
  }
}

describe('shouldReloadForSessionCookie', () => {
  it('reloads a signed-out panel when the web app signs in', () => {
    expect(shouldReloadForSessionCookie({ change: change(), isSignedIn: false, syncHostname })).toBe(true)
  })

  it('reloads a signed-in panel when the web app signs out', () => {
    expect(
      shouldReloadForSessionCookie({ change: change({ value: '0' }), isSignedIn: true, syncHostname })
    ).toBe(true)
  })

  it('reloads a signed-in panel when the cookie is deleted', () => {
    expect(
      shouldReloadForSessionCookie({ change: change({ removed: true }), isSignedIn: true, syncHostname })
    ).toBe(true)
  })

  it('stays put when a signed-in session only gets a newer timestamp', () => {
    expect(shouldReloadForSessionCookie({ change: change(), isSignedIn: true, syncHostname })).toBe(false)
  })

  it('stays put when a signed-out panel sees the web app is signed out too', () => {
    expect(
      shouldReloadForSessionCookie({ change: change({ value: '0' }), isSignedIn: false, syncHostname })
    ).toBe(false)
  })

  it('ignores the removal half of a cookie overwrite', () => {
    expect(
      shouldReloadForSessionCookie({
        change: change({ removed: true, cause: 'overwrite' }),
        isSignedIn: true,
        syncHostname,
      })
    ).toBe(false)
  })

  it('waits while Clerk is still loading', () => {
    expect(shouldReloadForSessionCookie({ change: change(), isSignedIn: undefined, syncHostname })).toBe(false)
  })

  it('ignores other cookies and other sites', () => {
    expect(
      shouldReloadForSessionCookie({ change: change({ name: '__client' }), isSignedIn: false, syncHostname })
    ).toBe(false)
    expect(
      shouldReloadForSessionCookie({ change: change({ domain: '.example.com' }), isSignedIn: false, syncHostname })
    ).toBe(false)
  })
})

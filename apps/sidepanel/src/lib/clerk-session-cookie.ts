const CLIENT_UAT_COOKIE = '__client_uat'

/**
 * Decides whether a cookie change means the panel's signed-in state is out of date.
 *
 * `__client_uat` is "0" when the web app is signed out and a timestamp when signed in. The
 * panel must not watch Clerk's stored token for this: after an extension sign-out the sync-host
 * cookie is stale, so Clerk issues a new token on every request and the panel would reload until
 * the web app next refreshes that cookie.
 */
export function shouldReloadForSessionCookie({
  change,
  isSignedIn,
  syncHostname,
}: {
  change: chrome.cookies.CookieChangeInfo
  isSignedIn: boolean | undefined
  syncHostname: string
}): boolean {
  const { cookie, removed, cause } = change
  if (cookie.name !== CLIENT_UAT_COOKIE) return false
  if (removed && cause === 'overwrite') return false
  if (isSignedIn === undefined) return false

  const domain = cookie.domain.replace(/^\./, '')
  if (syncHostname !== domain && !syncHostname.endsWith(`.${domain}`)) return false

  const cookieSaysSignedIn = !removed && cookie.value !== '' && cookie.value !== '0'
  return cookieSaysSignedIn !== isSignedIn
}

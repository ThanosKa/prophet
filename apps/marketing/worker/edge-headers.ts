/**
 * Hosts that serve the production Worker for testing only. They must stay out of search
 * engines: they carry the whole site and API on the live database. Remove at cutover.
 */
function isTestHost(hostname: string): boolean {
  return hostname === 'cf-test.prophetchrome.com' || hostname.endsWith('.workers.dev')
}

/** vinext applies next.config `headers()` to everything but redirects; Vercel sends these on them too. */
const REDIRECT_SECURITY_HEADERS = [
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'SAMEORIGIN'],
] as const

/**
 * Headers the Worker adds on top of vinext's answer. A response with nothing to add comes
 * back as the same object, so its body and Content-Length are untouched.
 */
export function withEdgeHeaders({ request, response }: { request: Request; response: Response }): Response {
  const additions: Array<readonly [string, string]> = []
  if (isTestHost(new URL(request.url).hostname)) additions.push(['X-Robots-Tag', 'noindex, nofollow'])
  if (response.status >= 300 && response.status < 400) {
    additions.push(...REDIRECT_SECURITY_HEADERS.filter(([name]) => !response.headers.has(name)))
  }
  if (additions.length === 0) return response

  let target = response
  try {
    additions.forEach(([name, value]) => target.headers.set(name, value))
  } catch {
    // Static files and Response.redirect() have immutable headers.
    target = new Response(response.body, response)
    additions.forEach(([name, value]) => target.headers.set(name, value))
  }
  return target
}

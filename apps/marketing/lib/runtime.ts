/** True on the Cloudflare Workers runtime, false under Node (Next.js, Vercel, scripts, tests). */
export function isWorkerRuntime(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers'
}

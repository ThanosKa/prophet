export const EXTENSION_ID = 'febgdmgcdimmjfkfblbpjmkjfepmfkif'

export const CHROME_STORE_URL = `https://chromewebstore.google.com/detail/prophet/${EXTENSION_ID}`

export const BASE_URL = 'https://prophetchrome.com'

// NEXT_PUBLIC_APP_URL is configured with a trailing slash in production, which
// would produce '//account' in Stripe redirect URLs if interpolated directly.
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!configured) return BASE_URL
  return configured.replace(/\/+$/, '')
}

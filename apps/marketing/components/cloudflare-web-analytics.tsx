// The beacon token is public: it ships in every page's HTML by design.
const BEACON_TOKEN = '78e27d1fb0b6460fbece52cca9cfb15a'

/** Cloudflare Web Analytics beacon. It sets no cookies. */
export function CloudflareWebAnalytics() {
  return (
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token: BEACON_TOKEN })}
    />
  )
}

// Submits every URL in the production sitemap to IndexNow (Bing, Yandex, Seznam, Naver...).
// Run by hand AFTER a deploy, once the key file below is live on production:
//
//   node apps/marketing/scripts/indexnow.mjs            # submit
//   node apps/marketing/scripts/indexnow.mjs --dry-run  # print what would be sent
//
// Google does not use IndexNow; this does not replace Search Console.

const HOST = 'prophetchrome.com'
const KEY = 'd70f122b238b657996b85f9e8e4049be'
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`
const SITEMAP_URL = `https://${HOST}/sitemap.xml`
const ENDPOINT = 'https://api.indexnow.org/indexnow'

const dryRun = process.argv.includes('--dry-run')

async function fetchSitemapUrls() {
  const response = await fetch(SITEMAP_URL)
  if (!response.ok) throw new Error(`Sitemap fetch failed: ${response.status}`)
  const xml = await response.text()
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) => match[1])
}

async function main() {
  const keyResponse = await fetch(KEY_LOCATION)
  const keyBody = keyResponse.ok ? (await keyResponse.text()).trim() : ''
  if (keyBody !== KEY) {
    throw new Error(`Key file not live yet at ${KEY_LOCATION}. Deploy first, then re-run.`)
  }

  const urlList = await fetchSitemapUrls()
  if (urlList.length === 0) throw new Error('Sitemap contained no URLs')
  console.log(`Submitting ${urlList.length} URLs for ${HOST}`)

  const payload = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }
  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2))
    return
  }

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  })
  // 200 = accepted, 202 = accepted and key validation pending. Anything else is a problem.
  console.log(`IndexNow responded ${response.status} ${response.statusText}`)
  if (response.status !== 200 && response.status !== 202) process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})

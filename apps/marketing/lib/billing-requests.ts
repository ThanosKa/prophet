/** Turn a Stripe session endpoint's answer into a redirect, or an error for the user (a 429 included). */
export async function redirectToStripeSession({
  request,
  redirect,
  notifyError,
}: {
  request: () => Promise<Response>
  redirect: (url: string) => void
  notifyError: () => void
}): Promise<void> {
  try {
    const response = await request()
    const data: unknown = await response.json()
    const url =
      response.ok && typeof data === 'object' && data !== null && 'url' in data && typeof data.url === 'string'
        ? data.url
        : null
    if (!url) {
      notifyError()
      return
    }
    redirect(url)
  } catch {
    notifyError()
  }
}

/** Hand the usage CSV to `save`, or show an error for the user (a 429 included) instead of leaving the page. */
export async function downloadUsageExport({
  request,
  save,
  notifyError,
}: {
  request: () => Promise<Response>
  save: (file: Blob) => void
  notifyError: () => void
}): Promise<void> {
  try {
    const response = await request()
    if (!response.ok) {
      notifyError()
      return
    }
    save(await response.blob())
  } catch {
    notifyError()
  }
}

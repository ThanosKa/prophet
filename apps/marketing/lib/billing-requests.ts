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

/**
 * Start a plan change from the pricing page. A subscriber switches the plan they have in the
 * billing portal; everyone else gets a Checkout. A checkout refused with `SUBSCRIPTION_EXISTS`
 * (a page loaded before the user subscribed) opens the portal instead of showing an error.
 */
export async function startPlanChange({
  hasPlan,
  checkout,
  portal,
  redirect,
  notifyError,
}: {
  hasPlan: boolean
  checkout: () => Promise<Response>
  portal: () => Promise<Response>
  redirect: (url: string) => void
  notifyError: () => void
}): Promise<void> {
  if (hasPlan) {
    await redirectToStripeSession({ request: portal, redirect, notifyError })
    return
  }
  await redirectToStripeSession({
    request: async () => {
      const response = await checkout()
      if (response.status !== 409) return response
      const data: unknown = await response.clone().json()
      const subscriptionExists =
        typeof data === 'object' && data !== null && 'code' in data && data.code === 'SUBSCRIPTION_EXISTS'
      return subscriptionExists ? portal() : response
    },
    redirect,
    notifyError,
  })
}

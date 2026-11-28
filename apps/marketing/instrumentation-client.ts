import { init } from '@sentry/browser'
import { EXTENSION_URLS, isAutomatedBrowser, isNoise, isTranslatedPage } from '@/lib/error-noise'
import { ERROR_TRACKING } from '@/lib/error-tracking'

let unloading = false

function watchUnload(): void {
  const markUnloading = (): void => {
    unloading = true
  }
  addEventListener('beforeunload', markUnloading)
  addEventListener('pagehide', markUnloading)
  addEventListener('pageshow', () => {
    unloading = false
  })
}

if (ERROR_TRACKING.enabled && !isAutomatedBrowser(navigator)) {
  const { beforeSend } = ERROR_TRACKING
  watchUnload()
  init({
    ...ERROR_TRACKING,
    tracePropagationTargets: [],
    denyUrls: EXTENSION_URLS,
    beforeSend: (event, hint) => {
      const page = { unloading, translated: isTranslatedPage(document.documentElement) }
      if (isNoise({ event, page })) return null
      return beforeSend ? beforeSend(event, hint) : event
    },
    integrations: (defaults) => defaults.filter((integration) => integration.name !== 'BrowserSession'),
  })
}

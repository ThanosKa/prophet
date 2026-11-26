import { init } from '@sentry/browser'
import { ERROR_TRACKING } from '@/lib/error-tracking'

const { enabled, ...options } = ERROR_TRACKING

if (enabled) {
  init({
    ...options,
    tracePropagationTargets: [],
    integrations: (defaults) => defaults.filter((integration) => integration.name !== 'BrowserSession'),
  })
}

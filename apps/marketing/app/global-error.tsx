'use client'

import { captureException } from '@sentry/browser'
import { useEffect } from 'react'
import DefaultGlobalError from 'vinext/shims/default-global-error'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (!error.digest) captureException(error)
  }, [error])

  return <DefaultGlobalError error={error} reset={reset} />
}

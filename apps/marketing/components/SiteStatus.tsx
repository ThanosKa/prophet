'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { STATUS_PAGE_URL, describeSiteState, fetchSiteState, type SiteState } from '@/lib/site-status'

const STATUS_TIMEOUT_MS = 5000

export function SiteStatus() {
  const [state, setState] = useState<SiteState | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS)
    void fetchSiteState(controller.signal).then((next) => {
      clearTimeout(timeout)
      setState(next)
    })
    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  const { label, dotClass } = describeSiteState(state)

  return (
    <a
      href={STATUS_PAGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 hover:text-foreground transition motion-reduce:transition-none"
    >
      <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', dotClass)} />
      {label}
    </a>
  )
}

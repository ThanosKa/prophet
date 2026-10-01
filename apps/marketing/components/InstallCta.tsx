import Link from 'next/link'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { CHROME_STORE_URL } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface InstallCtaProps {
  title: string
  description: string
  /** Extra content rendered between the description and the buttons (e.g. contextual links). */
  children?: ReactNode
  /** Optional second, outlined button next to "Add to Chrome". */
  secondary?: { href: string; label: string }
  /** Spacing for the outer section; defaults to a full-width page footer band. */
  className?: string
}

/**
 * Install call to action that always points at the Chrome Web Store listing from
 * lib/constants.ts, so the URL cannot drift between pages.
 */
export function InstallCta({
  title,
  description,
  children,
  secondary,
  className = 'py-16',
}: InstallCtaProps) {
  return (
    <section className={cn('text-center border-t', className)}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <p className="text-muted-foreground mb-6">{description}</p>
        {children}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href={CHROME_STORE_URL}>Add to Chrome</Link>
          </Button>
          {secondary && (
            <Button asChild variant="outline">
              <Link href={secondary.href}>{secondary.label}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

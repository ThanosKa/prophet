import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CHROME_STORE_URL } from '@/lib/seo/shared'

interface SEOCTAProps {
  title?: string
  description?: string
}

export function SEOCTA({
  title = 'Try Prophet Free',
  description = 'Install the extension and start using Claude AI in your browser.',
}: SEOCTAProps) {
  return (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">{title}</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          {description}
        </p>
        <Link href={CHROME_STORE_URL}>
          <Button size="lg" className="px-8">
            Add to Chrome
          </Button>
        </Link>
      </div>
    </section>
  )
}

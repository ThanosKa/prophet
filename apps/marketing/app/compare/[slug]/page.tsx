import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { comparisons, getComparisonBySlug } from '@/lib/seo/comparisons'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return comparisons.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = getComparisonBySlug(slug)
  if (!data) return {}
  return {
    title: data.h1,
    description: data.description,
    alternates: { canonical: `/compare/${data.slug}` },
  }
}

export default async function ComparisonPage({ params }: Props) {
  const { slug } = await params
  const data = getComparisonBySlug(slug)
  if (!data) notFound()

  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Home', url: 'https://prophetchrome.com' },
              { name: 'Compare', url: 'https://prophetchrome.com/compare' },
              {
                name: `Prophet vs ${data.competitor}`,
                url: `https://prophetchrome.com/compare/${data.slug}`,
              },
            ])
          ),
        }}
      />
      <Header />

      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">{data.h1}</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {data.description}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Last updated: March 2026
            </p>
          </div>

          {/* Quick Verdict */}
          <Card className="mb-12 border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Badge>Quick Verdict</Badge>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Prophet and {data.competitor} take different approaches to browser AI.
                Prophet focuses on deep browser automation through 18 Chrome DevTools Protocol
                tools and an accessibility-tree approach that delivers fast, deterministic
                interactions without vision models. It uses pay-per-use pricing, so you never
                pay for a month you don&apos;t use. {data.competitor} has its own strengths
                {data.competitorAdvantages.length > 0 &&
                  ` -- notably ${data.competitorAdvantages[0].toLowerCase()}`}
                . The right choice depends on whether you need real page automation (Prophet)
                or {data.competitor}&apos;s specific ecosystem advantages.
              </p>
            </CardContent>
          </Card>

          {/* Feature Comparison Table */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">
              Feature Comparison: Prophet vs {data.competitor}
            </h2>
            <p className="text-muted-foreground mb-6">
              A side-by-side breakdown of how Prophet and {data.competitor} handle
              the key capabilities you need from a browser AI extension. This
              comparison covers page understanding, automation depth, pricing,
              model selection, and data privacy.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px] font-semibold">Feature</TableHead>
                  <TableHead className="font-semibold">Prophet</TableHead>
                  <TableHead className="font-semibold">{data.competitor}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.featureMatrix.map((row) => (
                  <TableRow key={row.feature}>
                    <TableCell className="font-medium">{row.feature}</TableCell>
                    <TableCell>{row.prophet}</TableCell>
                    <TableCell>{row.competitor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          {/* Where Prophet Wins */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Where Prophet Wins</h2>
            <p className="text-muted-foreground mb-4">
              Prophet&apos;s core advantages come from its architectural decisions:
              the accessibility tree for page understanding, Chrome DevTools Protocol
              for automation, and a usage-based billing model that aligns cost with value.
            </p>
            <div className="space-y-3">
              {data.prophetAdvantages.map((adv, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <p className="text-muted-foreground">{adv}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Where Competitor Wins */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">
              Where {data.competitor} Wins
            </h2>
            <p className="text-muted-foreground mb-4">
              {data.competitor} has legitimate advantages that matter depending
              on your use case. Here is where it pulls ahead:
            </p>
            <div className="space-y-3">
              {data.competitorAdvantages.map((adv, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-2 shrink-0" />
                  <p className="text-muted-foreground">{adv}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Which Should You Choose */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">
              Which Should You Choose?
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">Choose Prophet if</strong> you
                need an AI that can actually interact with web pages -- clicking
                buttons, filling forms, navigating between pages, and managing
                tabs. Prophet&apos;s 18 automation tools go far beyond reading
                and summarizing text. Its pay-per-use pricing also makes it the
                better choice for users whose AI usage varies month to month.
                If you value open source transparency and want to verify exactly
                what data your browser extension collects, Prophet&apos;s public
                GitHub repository gives you that assurance.
              </p>
              <p>
                <strong className="text-foreground">
                  Choose {data.competitor} if
                </strong>{' '}
                {data.competitorAdvantages
                  .map((a) => a.charAt(0).toLowerCase() + a.slice(1))
                  .join(', and ')}
                . If those specific capabilities are central to your workflow,{' '}
                {data.competitor} may be the better fit despite Prophet&apos;s
                automation advantages.
              </p>
              <p>
                Both tools can be installed side by side in Chrome, so you can
                test each on your actual workflow before committing. Prophet&apos;s
                free tier includes $0.20 in credits -- enough for dozens of
                messages to evaluate whether it meets your needs.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* CTA */}
      <section className="py-16 text-center border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">
            Try Prophet Free
          </h2>
          <p className="text-muted-foreground mb-6">
            Install the extension, get $0.20 in free credits, and see how
            accessibility-tree automation compares to {data.competitor}. No
            credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link href="https://chromewebstore.google.com/detail/prophet/febgdmgcdimmjfkfblbpjmkjfepmfkif">
                Add to Chrome
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

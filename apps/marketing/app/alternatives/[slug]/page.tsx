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
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { alternatives, comparisons, getAlternativeBySlug } from '@/lib/seo/comparisons'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return alternatives.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = getAlternativeBySlug(slug)
  if (!data) return {}
  return {
    title: data.h1,
    description: data.description,
    alternates: { canonical: `/alternatives/${data.slug}` },
  }
}

const condensedFeatures = [
  'Page Understanding',
  'Browser Automation',
  'Pricing Model',
  'Starting Price',
  'Open Source',
]

export default async function AlternativePage({ params }: Props) {
  const { slug } = await params
  const data = getAlternativeBySlug(slug)
  if (!data) notFound()

  const comparison = comparisons.find(
    (c) => c.competitor === data.competitor
  )
  const condensedMatrix = comparison
    ? comparison.featureMatrix.filter((r) =>
        condensedFeatures.includes(r.feature)
      )
    : []

  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Home', url: 'https://prophetchrome.com' },
              {
                name: 'Alternatives',
                url: 'https://prophetchrome.com/alternatives',
              },
              {
                name: `${data.competitor} Alternative`,
                url: `https://prophetchrome.com/alternatives/${data.slug}`,
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

          {/* Why Users Switch */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">
              Why Users Switch From {data.competitor}
            </h2>
            <p className="text-muted-foreground mb-6">
              {data.competitor} is a capable tool, but it has limitations that push
              users to look for alternatives. These are the most common pain points
              we hear from users who switched to Prophet.
            </p>
            <div className="space-y-4">
              {data.painPoints.map((point, i) => (
                <Card key={i}>
                  <CardContent className="pt-6 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold">
                      {i + 1}
                    </div>
                    <p className="text-muted-foreground">{point}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* How Prophet Solves These Problems */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">
              How Prophet Solves These Problems
            </h2>
            <p className="text-muted-foreground mb-6">
              Prophet was designed from the ground up to address the gaps in
              existing browser AI tools. Here is how it tackles each pain point
              listed above.
            </p>
            <div className="space-y-4">
              {data.solutions.map((solution, i) => (
                <Card key={i} className="border-primary/20">
                  <CardContent className="pt-6 flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-xs font-bold">
                      {i + 1}
                    </div>
                    <p className="text-muted-foreground">{solution}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Condensed Comparison Table */}
          {condensedMatrix.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-4">
                Prophet vs {data.competitor} at a Glance
              </h2>
              <p className="text-muted-foreground mb-6">
                A condensed comparison of the key differences. For the full
                breakdown, see the{' '}
                <Link
                  href={`/compare/${comparison!.slug}`}
                  className="text-primary hover:underline"
                >
                  detailed comparison page
                </Link>
                .
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
                  {condensedMatrix.map((row) => (
                    <TableRow key={row.feature}>
                      <TableCell className="font-medium">{row.feature}</TableCell>
                      <TableCell>{row.prophet}</TableCell>
                      <TableCell>{row.competitor}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          )}

          {/* Switching Takes 2 Minutes */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">
              Switching Takes 2 Minutes
            </h2>
            <p className="text-muted-foreground mb-6">
              Moving from {data.competitor} to Prophet is straightforward. There
              is no data migration or complex setup -- just install, sign in, and
              start chatting.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: '1',
                  title: 'Install Prophet',
                  desc: 'Add Prophet to Chrome from the Web Store. One click.',
                },
                {
                  step: '2',
                  title: 'Create an Account',
                  desc: 'Sign up for free. You get $0.20 in credits instantly.',
                },
                {
                  step: '3',
                  title: 'Start Using It',
                  desc: 'Open the side panel on any page and ask Claude anything.',
                },
              ].map((item) => (
                <Card key={item.step} className="text-center">
                  <CardContent className="pt-6">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-2 font-bold">
                      {item.step}
                    </div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* CTA */}
      <section className="py-16 text-center border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">
            Ready to Switch From {data.competitor}?
          </h2>
          <p className="text-muted-foreground mb-6">
            Join users who moved to Prophet for real browser automation,
            pay-per-use pricing, and open-source trust. Free to start.
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

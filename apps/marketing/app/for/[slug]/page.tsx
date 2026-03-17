import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { professions, getProfession } from '@/lib/seo/professions'
import { CHROME_STORE_URL } from '@/lib/seo/shared'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return professions.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const profession = getProfession(slug)
  if (!profession) return {}
  return {
    title: profession.title,
    description: profession.description,
    alternates: { canonical: `/for/${profession.slug}` },
  }
}

const modelLabels: Record<string, string> = {
  haiku: 'Haiku 4.5',
  sonnet: 'Sonnet 4.6',
  opus: 'Opus 4.6',
}

const modelDescriptions: Record<string, string> = {
  haiku:
    'Claude Haiku 4.5 is the fastest and most affordable model. It handles straightforward tasks like drafting emails, answering questions, and summarizing content with low latency and minimal cost. Ideal when speed and budget matter more than deep reasoning.',
  sonnet:
    'Claude Sonnet 4.6 balances capability and cost. It handles complex tasks like code review, detailed analysis, and nuanced writing while keeping token costs reasonable. The best default choice for most professional workflows.',
  opus:
    'Claude Opus 4.6 is the most capable model, designed for tasks that require deep reasoning, multi-step analysis, and expert-level output. Best for research synthesis, complex problem-solving, and situations where quality justifies the higher token cost.',
}

export default async function ProfessionPage({ params }: PageProps) {
  const { slug } = await params
  const profession = getProfession(slug)
  if (!profession) notFound()

  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Home', url: 'https://prophetchrome.com' },
              { name: 'For Your Profession', url: 'https://prophetchrome.com/for' },
              { name: profession.h1.replace('Prophet for ', ''), url: `https://prophetchrome.com/for/${profession.slug}` },
            ])
          ),
        }}
      />
      <Header />

      <section className="py-20 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{profession.h1}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {profession.description}
          </p>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-3">A Day in the Life</h2>
          <p className="text-muted-foreground mb-8">
            Real scenarios where Prophet saves you time and keeps you in flow.
            Each of these tasks can be started from any browser tab — just open the
            side panel and ask.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {profession.scenarios.map((scenario) => (
              <Card key={scenario.title}>
                <CardHeader>
                  <CardTitle className="text-base">{scenario.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {scenario.description}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-3">Top Use Cases</h2>
          <p className="text-muted-foreground mb-8">
            These are the most common ways{' '}
            {profession.h1.replace('Prophet for ', '').toLowerCase()} use Prophet
            in their daily workflow.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {profession.relatedUseCases.map((useCase) => (
              <li key={useCase} className="flex items-center gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <Link
                  href={`/use-cases/${useCase}`}
                  className="text-primary hover:underline capitalize"
                >
                  {useCase.replace(/-/g, ' ')}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-3">Recommended Model</h2>
          <p className="text-muted-foreground mb-8">
            Prophet gives you access to three Claude models. Based on typical
            {' '}{profession.h1.replace('Prophet for ', '').toLowerCase()} workflows,
            we recommend starting with:
          </p>
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                  {modelLabels[profession.recommendedModel]}
                </span>
                <span className="text-sm text-muted-foreground">Recommended</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {modelDescriptions[profession.recommendedModel]}
              </p>
            </CardContent>
          </Card>
          <p className="text-sm text-muted-foreground mt-4">
            You can switch models at any time from the chat interface. All three
            models — Haiku 4.5, Sonnet 4.6, and Opus 4.6 — are available on every plan.
          </p>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-3">Typical Cost</h2>
          <p className="text-muted-foreground mb-8">
            Prophet uses pay-per-use pricing based on actual AI token consumption.
            There are no per-message fees — you pay only for the processing power
            each conversation uses.
          </p>
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold">{profession.typicalSessionCost}</span>
                <span className="text-sm text-muted-foreground">per session</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This range reflects typical sessions for{' '}
                {profession.h1.replace('Prophet for ', '').toLowerCase()} using the{' '}
                {modelLabels[profession.recommendedModel]} model. Shorter questions cost
                less; longer multi-turn conversations cost more. You can track your
                exact usage in your{' '}
                <Link href="/account/usage" className="text-primary hover:underline">
                  account dashboard
                </Link>.
              </p>
            </CardContent>
          </Card>
          <p className="text-sm text-muted-foreground mt-4">
            The Free plan includes $0.50 in credits to get started — no credit card
            required.{' '}
            <Link href="/pricing" className="text-primary hover:underline">
              View all plans
            </Link>
          </p>
        </div>
      </section>

      <section className="py-16 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">
            Start Using Prophet Today
          </h2>
          <p className="text-muted-foreground mb-6">
            Install the extension and bring Claude AI into your browser.
            Free plan available — no credit card required.
          </p>
          <Button asChild>
            <Link href={CHROME_STORE_URL}>Add to Chrome</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  )
}

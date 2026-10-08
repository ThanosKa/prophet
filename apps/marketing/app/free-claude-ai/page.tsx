import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { InstallCta } from '@/components/InstallCta'
import { RelatedLinks } from '@/components/RelatedLinks'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { faqPageJsonLd } from '@/lib/faqs'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  // The page argues that free unlimited Claude does not exist, so the snippet
  // promises real limits rather than a bypass. Promising a workaround the page
  // then denies is what produces the 0% CTR pattern elsewhere on this site.
  title: { absolute: "Free Claude AI: What's Actually Free in 2026 (Real Limits)" },
  description:
    'Claude is free, with caps. The real Sonnet 5.5 and Opus free limits, why free unlimited Claude is a myth, and the cheapest honest routes.',
  alternates: { canonical: '/free-claude-ai' },
}

const freeOptions = [
  {
    name: 'claude.ai free plan',
    cost: '$0',
    models: 'Sonnet 5.5 (Opus not included)',
    limits: 'Rolling message cap that resets every ~5 hours. Tightens at peak load.',
    catch: 'No API access, no browser integration, cannot read the page you are on.',
  },
  {
    name: 'Prophet free tier',
    cost: '$0 (no card)',
    models: 'Haiku 5.5, Sonnet 5.5, Opus 5.5',
    limits: 'A one-time $0.07 in credits, enough to try Haiku.',
    catch: 'Credits are finite. When they run out you either stop or buy more.',
  },
  {
    name: 'Bring your own API key (Harpa, Cline, etc.)',
    cost: 'Extension free, tokens billed by Anthropic',
    models: 'Any model your key can reach',
    limits: 'No cap beyond your own Anthropic spend.',
    catch: 'Not actually free — you pay Anthropic directly. Requires API key setup.',
  },
  {
    name: 'Third-party aggregators (Poe, Perplexity free tiers)',
    cost: '$0',
    models: 'Usually an older or smaller Claude model',
    limits: 'A handful of messages per day.',
    catch: 'Model version often lags. No control over which Claude you actually get.',
  },
]

const faqItems = [
  {
    question: 'Is Claude AI free?',
    answer:
      'Yes, partially. Anthropic runs a free plan on claude.ai that gives you access to Claude Sonnet 5.5 with a rolling message cap that resets roughly every five hours. It is genuinely free and requires no card, but it is metered, it gets tighter during peak demand, and it does not include Opus. There is no free plan that gives unlimited Claude usage, because every message costs Anthropic real compute.',
  },
  {
    question: 'Is Claude Sonnet 5.5 free?',
    answer:
      'Claude Sonnet 5.5 is available on the claude.ai free plan, but with a message cap rather than unlimited use. You get a set number of messages in a rolling window; once you hit it, you wait for the window to reset or upgrade. Sonnet 5.5 through the Anthropic API is never free — it is billed per token. Prophet lets you pick Sonnet 5.5 on any plan and bills it per use; its free $0.07 of credits is meant for trying Haiku, with no card required.',
  },
  {
    question: 'Is there a way to get Claude Sonnet 5.5 free and unlimited?',
    answer:
      'No, and any site claiming otherwise is either reselling a cracked key, proxying through someone else\'s account, or simply wrong. Anthropic bills compute per token, so unlimited free access is not something any legitimate provider can offer. The honest options are: use the metered claude.ai free plan, pay per token through the API, or use a pay-per-use client like Prophet where you only pay for the messages you actually send. Beware of "unlimited free Claude" sites — they routinely harvest credentials or serve a much weaker model than advertised.',
  },
  {
    question: 'Is Claude Opus 5.5 free?',
    answer:
      'Not on claude.ai. Opus 5.5 is Anthropic\'s most expensive model and is reserved for paid claude.ai plans. The only way to use Opus without a monthly subscription is through the API on a pay-per-token basis, or through a pay-per-use client that resells API access. Prophet lets you pick Opus 5.5 on any plan and bills it per use, though its free $0.07 of credits is meant for trying Haiku; Opus needs credits from a plan or a one-time purchase.',
  },
  {
    question: 'What are the Claude free tier limits in 2026?',
    answer:
      'Anthropic does not publish a fixed number, and that is deliberate: the claude.ai free cap is dynamic and scales with current server load. In practice free users report somewhere in the range of a handful to a couple dozen Sonnet messages per five-hour window, with long documents and attachments consuming the budget much faster than short questions. Long conversations also cost more per message because the entire thread is re-sent as context each turn.',
  },
  {
    question: 'How can I use Claude without paying $20 a month?',
    answer:
      'Three realistic routes. First, stay on the claude.ai free plan and live with the message cap. Second, use the Anthropic API directly and pay per token — cheap for light use, but you need to write code or configure a client. Third, use a pay-per-use extension like Prophet, which bills pay-per-use credits for the tokens you actually use. A light user sending a handful of Sonnet messages a day typically spends a couple of dollars a month, versus $20 flat for Claude Pro.',
  },
  {
    question: 'Does the Claude free tier let me use Claude on the web page I am reading?',
    answer:
      'No. The claude.ai free plan is a standalone chat interface with no browser integration, so you have to copy and paste page content into the chat. Anthropic\'s official Claude in Chrome extension requires a paid Claude subscription. A free Chrome side panel like Prophet reads the current page directly through the accessibility tree, which is the main practical reason to use an extension instead of the claude.ai tab.',
  },
]

export default function FreeClaudeAIPage() {
  const faqJsonLd = faqPageJsonLd(faqItems)

  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Home', url: 'https://prophetchrome.com' },
              { name: 'Free Claude AI', url: 'https://prophetchrome.com/free-claude-ai' },
            ])
          ),
        }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Header />

      <article className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Free Claude AI in 2026: Every Free Tier, Limit, and Workaround
            </h1>
            <p className="text-sm text-muted-foreground mb-6">Last updated: July 29, 2026</p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Claude AI is free, but not unlimited, and the gap between those two words is where most
              of the confusion lives. This page lays out exactly what you get for $0 on each route
              into Claude, what the caps actually are, and what to do when you hit them.
            </p>
            <aside className="mt-8 rounded-lg border border-border bg-muted/50 p-4">
              <p className="font-semibold mb-2">The short answer</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Claude Sonnet 5.5 is free on claude.ai with a rolling message cap. Claude Opus 5.5 is
                not free on claude.ai. Nobody offers free unlimited Claude, because Anthropic bills
                real compute per token. If the free cap is too tight but $20/month is too much, the
                middle option is paying per message instead of per month.
              </p>
            </aside>
          </div>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Is Claude AI free?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Yes. Anthropic runs a free plan on claude.ai that requires no payment method. You sign
              up with an email, and you get Claude Sonnet 5.5 with a message allowance that resets on
              a rolling window of roughly five hours. For casual use — a few questions a day, some
              writing help, the occasional document — the free plan is genuinely sufficient and
              always has been.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Where it stops working is sustained use. The cap is not a fixed number of messages; it
              is a compute budget, and long conversations drain it much faster than short ones because
              every turn re-sends the whole thread as context. Attach a 40-page PDF and you can exhaust
              a window in three messages. That is the point where most people start looking for
              alternatives, and it is worth understanding{' '}
              <Link href="/blog/is-claude-ai-free" className="text-primary hover:underline">
                what the Claude AI free plan actually includes
              </Link>{' '}
              before assuming a paid plan is the only way forward.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Is Claude Sonnet 5.5 free?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Sonnet 5.5 is the model you get on the claude.ai free plan, so yes — free, but metered.
              This is the source of most of the confusion, because &ldquo;Sonnet is on the free
              tier&rdquo; and &ldquo;Sonnet is free to use as much as you like&rdquo; are very
              different statements, and only the first one is true.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Through the Anthropic API, Sonnet 5.5 is never free. It is billed per input and output
              token, which is why any tool built on the API has to either charge you or resell someone
              else&apos;s quota. If you want to see what your actual usage would cost per token before
              committing to anything, the{' '}
              <Link href="/tools/ai-api-cost-calculator" className="text-primary hover:underline">
                Claude API cost calculator
              </Link>{' '}
              prices a real workload against current rates, and{' '}
              <Link href="/blog/claude-api-pricing-explained" className="text-primary hover:underline">
                Claude API pricing explained
              </Link>{' '}
              covers how input, output, and cached tokens are billed differently.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">
              &ldquo;Claude Sonnet 5.5 free unlimited&rdquo; — the honest answer
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              There is no such thing, and we would rather say that plainly than sell you something on
              a false premise. Every Claude message consumes GPU time that Anthropic pays for. No
              legitimate provider can give that away without limit. When you find a site promising
              unlimited free Claude Sonnet 5.5, one of four things is happening:
            </p>
            <ul className="space-y-3 text-muted-foreground mb-4">
              <li>
                <strong className="text-foreground">It is proxying a stolen or shared API key.</strong>{' '}
                These die within days when Anthropic revokes them, and your prompts pass through an
                unknown third party in the meantime.
              </li>
              <li>
                <strong className="text-foreground">It is silently serving a cheaper model.</strong>{' '}
                You are told it is Sonnet 5.5; you are getting a small open-weights model. This is the
                most common variant.
              </li>
              <li>
                <strong className="text-foreground">&ldquo;Unlimited&rdquo; has a hidden daily cap.</strong>{' '}
                Read the terms and there is a limit — it just is not on the landing page.
              </li>
              <li>
                <strong className="text-foreground">It is harvesting your data or credentials.</strong>{' '}
                Free-unlimited-AI sites are a well-established phishing category.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              The realistic version of &ldquo;unlimited&rdquo; is <em>cheap enough that you stop
              counting</em>. For most people that means paying per message rather than per month,
              which usually lands under $2 rather than $20 for the same workload.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Is Claude Opus 5.5 free?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Not on claude.ai. Opus 5.5 is Anthropic&apos;s frontier model and costs several times
              more per token than Sonnet, so it is gated behind the paid claude.ai plans. If you have
              only ever used the free plan, you have never used Opus.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The only routes to Opus without a monthly subscription are the API on a pay-per-token
              basis, or a client that resells API access per message. Prophet takes the second route:
              Opus 5.5 is available on the free tier, though it consumes the included credits quickly.
              If you are unsure whether you actually need Opus, the{' '}
              <Link href="/blog/claude-haiku-vs-sonnet-vs-opus" className="text-primary hover:underline">
                Claude Haiku vs Sonnet vs Opus comparison
              </Link>{' '}
              shows where the extra cost is and is not worth paying.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Every free way to use Claude AI, compared</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 font-semibold">Route</th>
                    <th className="text-left py-3 px-3 font-semibold">Cost</th>
                    <th className="text-left py-3 px-3 font-semibold">Models</th>
                    <th className="text-left py-3 px-3 font-semibold">Real limit</th>
                    <th className="text-left py-3 px-3 font-semibold">The catch</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {freeOptions.map((opt) => (
                    <tr key={opt.name} className="border-b align-top">
                      <td className="py-3 px-3 font-medium text-foreground">{opt.name}</td>
                      <td className="py-3 px-3">{opt.cost}</td>
                      <td className="py-3 px-3">{opt.models}</td>
                      <td className="py-3 px-3">{opt.limits}</td>
                      <td className="py-3 px-3">{opt.catch}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">What Prophet gives away free, and what it does not</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Prophet is a Chrome side panel built on the Anthropic API, so the same economics apply
              to us as to everyone else. Here is the honest accounting.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground">What is free:</strong> a one-time $0.07 in credits
              when you sign up, no credit card. That is enough to try Prophet on Haiku 5.5, the
              fastest and cheapest model. No model is locked behind a plan, and all 18 browser
              automation tools work on the free tier, but Sonnet 5.5 and Opus 5.5 cost more per
              message than the free credits are meant to cover.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground">What is not free:</strong> everything after that.
              Credits do not refill on a timer. There is no perpetual free allowance, because each
              message costs us real API spend. When the $0.07 runs out you buy more.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              What makes that palatable is that you are buying credits, not a subscription. 1 credit =
              1 cent, charged by the tokens each Turn uses with a minimum of 1 credit per Turn, and
              nothing else — no seat fee, no minimum spend. Credits you buy once never expire, so a
              quiet month costs you nothing. Compare that with a $20/month plan you use four times — the
              full breakdown is in{' '}
              <Link href="/blog/pay-per-use-ai-vs-subscription" className="text-primary hover:underline">
                pay-per-use AI vs subscription pricing
              </Link>
              , and the tier-by-tier numbers are on the{' '}
              <Link href="/pricing" className="text-primary hover:underline">
                Prophet pricing page
              </Link>
              .
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Using Claude without a subscription</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If the claude.ai free cap is too tight but a $20/month commitment is more than your
              usage justifies, the pay-per-use middle ground is where most light and medium users
              belong. You pay for messages sent, not for a month of availability.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The practical mechanics — how to move off a subscription, what breaks, and what a
              realistic monthly bill looks like at different usage levels — are covered in{' '}
              <Link href="/blog/use-claude-without-subscription" className="text-primary hover:underline">
                how to use Claude without a subscription
              </Link>
              . If you are comparing against ChatGPT Plus as well,{' '}
              <Link
                href="/blog/chatgpt-plus-vs-claude-pro-vs-prophet-pricing"
                className="text-primary hover:underline"
              >
                ChatGPT Plus vs Claude Pro vs Prophet pricing
              </Link>{' '}
              puts all three side by side at the same usage levels.
            </p>
          </section>

          <RelatedLinks
            title="Keep reading"
            intro="Related pages that go deeper on the questions this one only summarises."
            links={[
              {
                href: '/best-claude-chrome-extensions',
                anchor: 'Best Chrome extensions for Claude AI',
                context:
                  'five Claude extensions tested, including which ones have a usable free tier and which gate Claude behind a subscription.',
              },
              {
                href: '/blog/is-claude-ai-free',
                anchor: 'Is Claude AI free? The full breakdown',
                context: 'a deeper look at the claude.ai free plan, its caps, and how they change under load.',
              },
              {
                href: '/blog/free-ai-tools-2026',
                anchor: 'Free AI tools in 2026',
                context: 'what else is genuinely free beyond Claude, and where the catches are.',
              },
              {
                href: '/blog/hidden-costs-of-ai-subscriptions',
                anchor: 'The hidden costs of AI subscriptions',
                context: 'why flat monthly plans overcharge light users, with the arithmetic.',
              },
              {
                href: '/tools/ai-pricing-comparison',
                anchor: 'AI pricing comparison tool',
                context: 'current per-token rates for Claude, GPT and Gemini models side by side.',
              },
            ]}
          />

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {faqItems.map((item, i) => (
                <div key={i}>
                  <h3 className="font-semibold mb-2">{item.question}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </article>

      <InstallCta
        title="Try Claude free in your browser"
        description="A one-time $0.07 in credits to try Haiku 5.5, no card required, with all 18 browser tools on the free tier."
        secondary={{ href: '/pricing', label: 'See credit pricing' }}
      >
        <p className="text-sm text-muted-foreground mb-6">
          Weighing it against other options? See{' '}
          <Link href="/compare/prophet-vs-claude-in-chrome" className="text-primary hover:underline">
            Prophet vs Claude in Chrome
          </Link>{' '}
          and{' '}
          <Link href="/best-claude-chrome-extensions" className="text-primary hover:underline">
            the best Claude Chrome extensions
          </Link>
          .
        </p>
      </InstallCta>

      <Footer />
    </main>
  )
}

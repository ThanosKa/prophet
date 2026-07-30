import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { RelatedLinks } from '@/components/RelatedLinks'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { useCases, getUseCaseBySlug, getRelatedUseCases } from '@/lib/seo/use-cases'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Check, ArrowRight, AlertTriangle, Sparkles, MessageSquare } from 'lucide-react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface WorkflowStep {
  action: string
  detail: string
  tools: string[]
}

// Per-use-case account of what Prophet actually executes in the browser. Tool names
// are the real handlers in lib/agent/tools.ts, so this stays verifiable if they change.
const workflows: Record<string, WorkflowStep[]> = {
  research: [
    { action: 'Reads the page you are on', detail: 'Prophet builds an accessibility-tree snapshot of the article, paper, or docs page instead of screenshotting it, so headings, tables, and footnotes arrive as structured text.', tools: ['take_snapshot', 'get_page_content'] },
    { action: 'Follows the sources', detail: 'Ask it to check a citation and it opens the linked source in a background tab, reads it, and reports whether the claim actually holds up.', tools: ['open_new_tab', 'navigate', 'list_tabs'] },
    { action: 'Cross-references what you already have open', detail: 'Prophet can switch between your open tabs and reconcile conflicting numbers across several sources in one answer.', tools: ['switch_tab', 'search_snapshot'] },
  ],
  writing: [
    { action: 'Picks up the draft in place', detail: 'Prophet reads the text area you are writing in — Google Docs, a CMS editor, an email client — and works from what is already there rather than a pasted copy.', tools: ['take_snapshot', 'get_page_content'] },
    { action: 'Writes back into the field', detail: 'Accepted rewrites go straight into the editor by element ID, so you are not copying text between a chat window and your document.', tools: ['fill_element_by_uid', 'click_element_by_uid'] },
    { action: 'Keeps the reference material open', detail: 'Point it at a brief or style guide in another tab and it will hold both the source and the draft in the same conversation.', tools: ['switch_tab', 'search_snapshot'] },
  ],
  coding: [
    { action: 'Reads code from the page', detail: 'Prophet extracts code blocks from GitHub, GitLab, Stack Overflow, or your own docs with indentation and language intact.', tools: ['take_snapshot', 'get_page_content'] },
    { action: 'Navigates the repository', detail: 'Ask about a function and it will open the file, scroll to the definition, and read the surrounding context before answering.', tools: ['navigate', 'scroll_page', 'search_snapshot'] },
    { action: 'Checks the error against the source', detail: 'Paste a stack trace and Prophet can open the referenced library page and compare the documented signature against the call you wrote.', tools: ['open_new_tab', 'web_search'] },
  ],
  studying: [
    { action: 'Turns the page into study material', detail: 'Prophet reads lecture notes, PDFs rendered in the browser, or a course page and produces question-and-answer pairs from that specific content.', tools: ['take_snapshot', 'get_page_content'] },
    { action: 'Works through a course sequentially', detail: 'It can move between lesson pages and build a running summary across a whole module instead of one page at a time.', tools: ['navigate', 'go_back', 'scroll_page'] },
    { action: 'Explains without leaving the page', detail: 'Highlight a passage and ask for a simpler version; the answer appears in the side panel next to the original.', tools: ['search_snapshot', 'get_page_info'] },
  ],
  'email-drafting': [
    { action: 'Reads the thread you are replying to', detail: 'Prophet parses the full conversation in Gmail or Outlook, including quoted history, before drafting a reply.', tools: ['take_snapshot', 'get_page_content'] },
    { action: 'Types the reply into the compose box', detail: 'The draft goes directly into the compose field by element ID — no clipboard round trip and no lost formatting.', tools: ['fill_element_by_uid', 'click_element_by_uid'] },
    { action: 'Pulls in context from another tab', detail: 'Ask it to reference the contract or ticket you have open elsewhere and it reads that tab before writing.', tools: ['switch_tab', 'list_tabs'] },
  ],
  'content-creation': [
    { action: 'Studies the page that is ranking', detail: 'Point Prophet at a competing article and it extracts the heading structure, angle, and length as a factual outline.', tools: ['take_snapshot', 'get_page_content'] },
    { action: 'Drafts inside your CMS', detail: 'It writes into the WordPress, Webflow, or Notion editor you already have open rather than handing back a block of text to paste.', tools: ['fill_element_by_uid', 'scroll_page'] },
    { action: 'Checks claims before you publish', detail: 'Ask it to verify a statistic and it searches, opens the source, and tells you what the source actually says.', tools: ['web_search', 'open_new_tab'] },
  ],
  'data-analysis': [
    { action: 'Reads tables as tables', detail: 'Because Prophet uses the accessibility tree, an HTML table arrives with its row and column structure intact instead of as a flattened image.', tools: ['take_snapshot', 'get_page_content'] },
    { action: 'Walks paginated results', detail: 'It can click through pagination and collect every page of a report into one dataset before analysing it.', tools: ['click_element_by_uid', 'wait_for_navigation', 'scroll_page'] },
    { action: 'Compares across dashboards', detail: 'Open two analytics tabs and Prophet will reconcile the figures and tell you where the definitions differ.', tools: ['switch_tab', 'search_snapshot'] },
  ],
  'form-filling': [
    { action: 'Maps every field on the form', detail: 'Prophet snapshots the form and identifies each input by its label, type, and required state before touching anything.', tools: ['take_snapshot', 'search_snapshot'] },
    { action: 'Fills fields by element ID', detail: 'Values are written to specific elements rather than simulated keystrokes, so dropdowns, radio groups, and hidden fields behave correctly.', tools: ['fill_element_by_uid', 'click_element_by_uid'] },
    { action: 'Handles multi-step forms', detail: 'It submits a step, waits for the next page to render, and continues — useful for job applications and long onboarding flows.', tools: ['wait_for_navigation', 'wait_for_selector'] },
  ],
  summarization: [
    { action: 'Captures the whole page, not the visible part', detail: 'Prophet reads content below the fold and inside collapsed sections, so the summary covers the full article.', tools: ['take_snapshot', 'scroll_page', 'get_page_content'] },
    { action: 'Summarises several tabs at once', detail: 'Ask for a digest of everything you have open and it lists your tabs, reads each one, and returns a single brief.', tools: ['list_tabs', 'switch_tab'] },
    { action: 'Cites where each point came from', detail: 'Because it works from structured text, it can point back to the specific heading or section a claim came from.', tools: ['search_snapshot', 'get_page_info'] },
  ],
  'code-review': [
    { action: 'Reads the diff from the pull request page', detail: 'Prophet extracts added and removed lines from the GitHub or GitLab diff view with file paths attached.', tools: ['take_snapshot', 'get_page_content'] },
    { action: 'Expands the parts GitHub hides', detail: 'It clicks through collapsed files and "load more" controls so large pull requests are reviewed in full.', tools: ['click_element_by_uid', 'scroll_page', 'wait_for_selector'] },
    { action: 'Leaves the comment for you', detail: 'Approved review notes can be typed straight into the comment box on the relevant line.', tools: ['fill_element_by_uid'] },
  ],
  translation: [
    { action: 'Translates the page in context', detail: 'Prophet reads the full page structure, so headings, list items, and button labels are translated as the elements they are.', tools: ['take_snapshot', 'get_page_content'] },
    { action: 'Writes translations into forms', detail: 'Reply to a message in another language and the translated text goes directly into the input field.', tools: ['fill_element_by_uid'] },
    { action: 'Keeps the original alongside', detail: 'The side panel shows the translation next to the untouched page, so you can check terminology yourself.', tools: ['search_snapshot', 'get_page_info'] },
  ],
  proofreading: [
    { action: 'Reads what is in the editor', detail: 'Prophet checks the live contents of the text field rather than a copy, so it catches what you have actually written.', tools: ['take_snapshot', 'get_page_content'] },
    { action: 'Applies fixes in place', detail: 'Accepted corrections are written back into the same field by element ID.', tools: ['fill_element_by_uid'] },
    { action: 'Checks long documents section by section', detail: 'It scrolls through the document and reports issues with enough surrounding text that you can find them.', tools: ['scroll_page', 'search_snapshot'] },
  ],
  'competitive-analysis': [
    { action: 'Reads a competitor page as structured data', detail: 'Pricing tables, feature lists, and plan names come back as fields rather than prose, which makes them comparable.', tools: ['take_snapshot', 'get_page_content'] },
    { action: 'Collects several competitors in one pass', detail: 'Prophet opens each site in turn, extracts the same fields, and returns one comparison table.', tools: ['open_new_tab', 'navigate', 'switch_tab'] },
    { action: 'Digs past the marketing page', detail: 'It can follow links to changelogs, docs, and status pages to check what is actually shipped.', tools: ['click_element_by_uid', 'web_search'] },
  ],
  documentation: [
    { action: 'Reads the code or interface being documented', detail: 'Prophet extracts function signatures, parameters, and UI labels from the page so the documentation matches reality.', tools: ['take_snapshot', 'get_page_content'] },
    { action: 'Walks a flow and writes it up', detail: 'It can click through a sequence of screens and record each step, which is how you get an accurate how-to.', tools: ['click_element_by_uid', 'wait_for_navigation', 'get_page_info'] },
    { action: 'Drafts into your docs tool', detail: 'The result is written into the Notion, Confluence, or Markdown editor you already have open.', tools: ['fill_element_by_uid'] },
  ],
  brainstorming: [
    { action: 'Starts from what is on screen', detail: 'Prophet reads your brief, backlog, or whiteboard export first, so the ideas respond to your actual constraints.', tools: ['take_snapshot', 'get_page_content'] },
    { action: 'Pulls in prior art', detail: 'Ask what already exists and it searches, opens the results, and reports what has been tried.', tools: ['web_search', 'open_new_tab'] },
    { action: 'Captures the output where you work', detail: 'Selected ideas are written into the document or ticket rather than left in a chat log.', tools: ['fill_element_by_uid', 'switch_tab'] },
  ],
}

export function generateStaticParams() {
  return useCases.map((uc) => ({ slug: uc.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const uc = getUseCaseBySlug(slug)
  if (!uc) return {}

  return {
    title: uc.title,
    description: uc.description,
    alternates: { canonical: `/use-cases/${uc.slug}` },
    keywords: [
      uc.keyword,
      'AI Chrome extension',
      'browser AI assistant',
      'Prophet',
    ],
  }
}

export default async function UseCasePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const uc = getUseCaseBySlug(slug)
  if (!uc) notFound()

  const related = getRelatedUseCases(uc.relatedSlugs)
  const label = uc.slug.replace(/-/g, ' ')
  const steps = workflows[uc.slug] ?? []

  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Home', url: 'https://prophetchrome.com' },
              { name: 'Use Cases', url: 'https://prophetchrome.com/use-cases' },
              {
                name: uc.title,
                url: `https://prophetchrome.com/use-cases/${uc.slug}`,
              },
            ])
          ),
        }}
      />
      <Header />

      <section className="py-20 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{uc.h1}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {uc.description}
          </p>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            Why {label} slows you down today
          </h2>
          <div className="space-y-4">
            {uc.painPoints.map((point) => (
              <div key={point} className="flex items-start gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-2 shrink-0" />
                <p className="text-muted-foreground leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            How Prophet changes {label}
          </h2>
          <div className="grid gap-4">
            {uc.features.map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-muted-foreground leading-relaxed">
                  {feature}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {steps.length > 0 && (
        <section className="py-16 border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold mb-3">
              What Prophet actually does for {label}
            </h2>
            <p className="text-muted-foreground mb-8">
              Prophet is not a chat box that reads pasted text. It works against the
              live page through Chrome, using the same browser tools every time. Here
              is the sequence for {label}, and the tools it calls at each stage.
            </p>
            <div className="space-y-8">
              {steps.map((step, i) => (
                <div key={step.action}>
                  <h3 className="font-semibold mb-2">
                    {i + 1}. {step.action}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    {step.detail}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {step.tools.map((tool) => (
                      <code
                        key={tool}
                        className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground"
                      >
                        {tool}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Prompts to try for {label}
          </h2>
          <p className="text-muted-foreground mb-6">
            Open the Prophet side panel on a page where you would normally do{' '}
            {label} by hand, then paste one of these in.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {uc.examplePrompts.map((prompt) => (
              <Card key={prompt}>
                <CardContent className="py-4">
                  <p className="text-sm leading-relaxed">&ldquo;{prompt}&rdquo;</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="py-16 border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold mb-8">
              Other things people do alongside {label}
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {related.map((r) => (
                <Link key={r.slug} href={`/use-cases/${r.slug}`}>
                  <Card className="h-full hover:bg-muted/50 transition-colors group">
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                        {r.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {r.description}
                      </p>
                      <span className="text-sm text-primary flex items-center gap-1">
                        Learn more
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <RelatedLinks
            title="Choosing a tool for this"
            intro={`If you are still deciding which extension to use for ${label}, these compare the options rather than describing one of them.`}
            links={[
              {
                href: '/best-ai-chrome-extensions',
                anchor: 'Best AI Chrome extensions in 2026',
                context: 'nine extensions ranked, with free tiers and real prices.',
              },
              {
                href: '/best-claude-chrome-extensions',
                anchor: 'Best Chrome extensions for Claude AI',
                context: 'the Claude-specific ranking, including which expose Opus 5.',
              },
              {
                href: '/best-ai-sidebar-extensions',
                anchor: 'Best AI sidebar extensions for Chrome',
                context: 'side panel tools compared, and which can act on pages rather than just read them.',
              },
              {
                href: '/free-claude-ai',
                anchor: 'Free Claude AI: every free tier and limit',
                context: 'how far you can get on this workflow without paying anything.',
              },
              {
                href: '/guides',
                anchor: 'Step-by-step Prophet guides',
                context: 'walkthroughs for this and the other common workflows.',
              },
              {
                href: '/for',
                anchor: 'Prophet by profession',
                context: 'the same capabilities framed around twelve specific roles.',
              },
            ]}
          />
        </div>
      </section>

      <section className="py-16 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">
            Ready to Try Prophet for {uc.title.replace(/^AI\s+/, '').replace(/\s+in Chrome$/, '')}?
          </h2>
          <p className="text-muted-foreground mb-6">
            Install the extension and start using Claude AI in your browser. Free
            plan available — no credit card required.
          </p>
          <Button asChild>
            <Link href="https://chromewebstore.google.com/detail/prophet/febgdmgcdimmjfkfblbpjmkjfepmfkif">
              Add to Chrome
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  )
}

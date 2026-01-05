import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  MousePointer2,
  Type,
  Navigation,
  Scroll,
  FileText,
  Search,
  Clock,
  Layers,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Info,
  Eye,
  MousePointerClick,
  PanelTop,
  Shield,
  Cpu,
  Network,
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How It Works | Prophet',
  description: 'Deep dive into Prophet\'s browser control technology, Chrome DevTools Protocol, and AI agent capabilities.',
}

const tools = [
  {
    name: 'take_snapshot',
    description: 'Captures the accessibility tree of the current page, returning all interactive elements with unique UIDs.',
    icon: Eye,
    category: 'Observation',
  },
  {
    name: 'click_element_by_uid',
    description: 'Clicks an element using its unique identifier from the snapshot.',
    icon: MousePointerClick,
    category: 'Interaction',
  },
  {
    name: 'fill_element_by_uid',
    description: 'Fills text inputs and textareas with specified values.',
    icon: Type,
    category: 'Interaction',
  },
  {
    name: 'hover_element_by_uid',
    description: 'Triggers hover states to reveal menus or tooltips.',
    icon: MousePointer2,
    category: 'Interaction',
  },
  {
    name: 'navigate',
    description: 'Navigates the browser to a specified URL.',
    icon: Navigation,
    category: 'Navigation',
  },
  {
    name: 'scroll_page',
    description: 'Scrolls the page in any direction (up, down, left, right, top, bottom).',
    icon: Scroll,
    category: 'Navigation',
  },
  {
    name: 'get_page_content',
    description: 'Extracts the cleaned text content of the current page.',
    icon: FileText,
    category: 'Observation',
  },
  {
    name: 'search_snapshot',
    description: 'Searches the snapshot for elements matching a text query.',
    icon: Search,
    category: 'Observation',
  },
  {
    name: 'wait_for_selector',
    description: 'Waits for a CSS selector to appear in the DOM.',
    icon: Clock,
    category: 'Wait',
  },
  {
    name: 'wait_for_navigation',
    description: 'Waits for page navigation to complete.',
    icon: Clock,
    category: 'Wait',
  },
  {
    name: 'wait_for_timeout',
    description: 'Pauses execution for a specified duration.',
    icon: Clock,
    category: 'Wait',
  },
  {
    name: 'list_tabs',
    description: 'Lists all open browser tabs.',
    icon: Layers,
    category: 'Tabs',
  },
  {
    name: 'switch_tab',
    description: 'Switches focus to a specific tab by ID.',
    icon: PanelTop,
    category: 'Tabs',
  },
  {
    name: 'close_tab',
    description: 'Closes a specific tab by ID.',
    icon: PanelTop,
    category: 'Tabs',
  },
  {
    name: 'open_new_tab',
    description: 'Opens a URL in a new tab.',
    icon: PanelTop,
    category: 'Tabs',
  },
  {
    name: 'go_back',
    description: 'Navigates back in browser history.',
    icon: ArrowLeft,
    category: 'Navigation',
  },
  {
    name: 'go_forward',
    description: 'Navigates forward in browser history.',
    icon: ArrowRight,
    category: 'Navigation',
  },
  {
    name: 'reload_page',
    description: 'Reloads the current page.',
    icon: RefreshCw,
    category: 'Navigation',
  },
  {
    name: 'get_page_info',
    description: 'Gets metadata about the current page (URL, title, viewport).',
    icon: Info,
    category: 'Observation',
  },
]

const categories = ['Observation', 'Interaction', 'Navigation', 'Wait', 'Tabs']

export default function HowItWorksPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <Header />

      <section className="py-20 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="outline" className="mb-4">Technical Deep Dive</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            How Prophet Controls Your Browser
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Prophet uses Chrome DevTools Protocol and an accessibility-first approach to give Claude AI
            precise control over your browser, enabling autonomous task completion.
          </p>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            Architecture Overview
          </h2>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Prophet operates through a multi-layer architecture that keeps your API keys secure while
              providing Claude with powerful browser control capabilities:
            </p>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { step: '1', title: 'Side Panel', desc: 'You send a message' },
                { step: '2', title: 'Marketing API', desc: 'Authenticated & rate-limited' },
                { step: '3', title: 'Claude API', desc: 'AI processes request' },
                { step: '4', title: 'Browser', desc: 'Tools execute actions' },
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
            <p className="text-sm text-muted-foreground">
              The Anthropic API key is stored securely on the marketing server and never exposed to the client.
              All requests are authenticated via Clerk and rate-limited via Upstash Redis.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" />
            Chrome DevTools Protocol
          </h2>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Prophet uses the Chrome DevTools Protocol (CDP) to interact with your browser. CDP is the same
              protocol used by Chrome DevTools and provides:
            </p>
            <ul className="grid gap-3 md:grid-cols-2">
              {[
                'Direct DOM access and manipulation',
                'Mouse and keyboard event simulation',
                'Page navigation control',
                'Network request interception',
                'Accessibility tree inspection',
                'Tab management',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <p className="text-sm font-mono">
                  {`// Example: CDP command to click at coordinates
chrome.debugger.sendCommand(
  { tabId },
  'Input.dispatchMouseEvent',
  { type: 'mousePressed', x: 100, y: 200, button: 'left' }
)`}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" />
            Accessibility Tree: How Prophet &quot;Sees&quot; Pages
          </h2>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Instead of parsing raw HTML, Prophet uses the browser&apos;s accessibility tree. This provides a
              semantic, structured view of the page that&apos;s ideal for AI interaction:
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Why Accessibility Tree?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Focuses on interactive elements (buttons, links, inputs)</p>
                  <p>Filters out visual noise and decorative elements</p>
                  <p>Provides semantic roles and names</p>
                  <p>More stable than CSS selectors across page changes</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">UID System</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Each element gets a unique 8-character ID</p>
                  <p>IDs are injected as data-prophet-nodeid attributes</p>
                  <p>Stable across snapshots for the same elements</p>
                  <p>Never exposed to users (internal only)</p>
                </CardContent>
              </Card>
            </div>
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <p className="text-sm font-mono whitespace-pre">
{`// Example snapshot output
uid=Ab12Cd3E button "Submit" <button>
uid=Xy98Zw7V textbox "Email" value="user@example.com" <input>
  uid=Mn45Op6Q link "Forgot password?" <a>`}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">Agent Tools ({tools.length} Available)</h2>
          <p className="text-muted-foreground mb-8">
            Prophet provides Claude with {tools.length} tools for browser automation. Each tool is designed
            for a specific type of interaction:
          </p>
          {categories.map((category) => (
            <div key={category} className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground">{category}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {tools
                  .filter((tool) => tool.category === category)
                  .map((tool) => {
                    const Icon = tool.icon
                    return (
                      <Card key={tool.name} className="hover:bg-muted/50 transition-colors">
                        <CardContent className="py-4 flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-mono text-sm font-medium">{tool.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Security Model
          </h2>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-green-600 dark:text-green-400">What&apos;s Protected</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>API keys stored server-side only</p>
                  <p>All requests authenticated via Clerk</p>
                  <p>Rate limiting prevents abuse</p>
                  <p>Conversations processed, not stored long-term</p>
                  <p>CDP debugger auto-detaches after 30s</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">User Controls</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Stop button on every page during execution</p>
                  <p>Visual border shows when agent is active</p>
                  <p>Agent confirms destructive actions</p>
                  <p>Never enters credentials without explicit instruction</p>
                  <p>Maximum 10 turns per conversation</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">Tech Stack</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { name: 'Chrome Extension', tech: 'Vite, React 18, CRXJS' },
              { name: 'Marketing & API', tech: 'Next.js 16, Drizzle ORM' },
              { name: 'AI', tech: 'Anthropic Claude Sonnet 4.5' },
              { name: 'Authentication', tech: 'Clerk v2.0' },
              { name: 'Database', tech: 'Supabase PostgreSQL' },
              { name: 'Rate Limiting', tech: 'Upstash Redis' },
            ].map((item) => (
              <Card key={item.name}>
                <CardContent className="pt-6">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.tech}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

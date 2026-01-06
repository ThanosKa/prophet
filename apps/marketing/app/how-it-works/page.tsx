import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Eye,
  Cpu,
  Network,
  Layers,
  MousePointerClick,
  Type,
  Navigation,
  Scroll,
  FileText,
  Search,
  Clock,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Info,
  PanelTop,
  MousePointer2,
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How It Works | Prophet',
  description: 'Deep dive into how Prophet\'s AI agent sees, thinks, and interacts with web pages using the accessibility tree and browser automation.',
}

const agentTools = [
  {
    name: 'take_snapshot',
    description: 'Captures the accessibility tree - how the agent "sees" the page with all interactive elements.',
    icon: Eye,
    category: 'Observation',
  },
  {
    name: 'click_element_by_uid',
    description: 'Clicks buttons, links, checkboxes using unique identifiers from the snapshot.',
    icon: MousePointerClick,
    category: 'Interaction',
  },
  {
    name: 'fill_element_by_uid',
    description: 'Types into text inputs, textareas, and form fields.',
    icon: Type,
    category: 'Interaction',
  },
  {
    name: 'hover_element_by_uid',
    description: 'Hovers over elements to reveal dropdowns and tooltips.',
    icon: MousePointer2,
    category: 'Interaction',
  },
  {
    name: 'navigate',
    description: 'Navigates the browser to a specific URL.',
    icon: Navigation,
    category: 'Navigation',
  },
  {
    name: 'scroll_page',
    description: 'Scrolls the page in any direction to reveal more content.',
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
    description: 'Searches the accessibility tree for specific elements by text.',
    icon: Search,
    category: 'Observation',
  },
  {
    name: 'wait_for_selector',
    description: 'Waits for dynamic content to load (for SPAs like React/Vue).',
    icon: Clock,
    category: 'Wait',
  },
  {
    name: 'wait_for_navigation',
    description: 'Waits for page navigation to complete before proceeding.',
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
    description: 'Switches focus to a specific tab.',
    icon: PanelTop,
    category: 'Tabs',
  },
  {
    name: 'close_tab',
    description: 'Closes a specific tab.',
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
          <Badge variant="outline" className="mb-4">Under the Hood</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            How Prophet's Agent Works
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A technical look at how our AI agent sees web pages, makes decisions, and automates browser tasks using Anthropic Claude and the accessibility tree. Built with the Anthropic SDK.
          </p>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            The Agent Loop
          </h2>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Prophet's agent follows a continuous loop to understand and interact with web pages:
            </p>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { step: '1', title: 'Observe', desc: 'Take accessibility tree snapshot' },
                { step: '2', title: 'Think', desc: 'Claude analyzes page & task' },
                { step: '3', title: 'Act', desc: 'Execute tool calls on browser' },
                { step: '4', title: 'Repeat', desc: 'Continue until task complete' },
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
              The agent can execute up to 10 tool calls per conversation to prevent runaway behavior. Each action is logged in the chat for full transparency.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" />
            How the Agent "Sees" Pages
          </h2>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Instead of raw HTML, Prophet uses the browser's <strong className="text-foreground">accessibility tree</strong> - a structured representation of interactive elements that's perfect for AI understanding.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Why Accessibility Tree?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>• Focuses only on interactive elements (buttons, links, inputs)</p>
                  <p>• Filters out visual noise and decorative elements</p>
                  <p>• Provides semantic roles and names</p>
                  <p>• More stable than CSS selectors across page changes</p>
                  <p>• Same data structure screen readers use</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Unique Identifier System</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>• Each element gets an 8-character UID</p>
                  <p>• UIDs injected as data-prophet-nodeid attributes</p>
                  <p>• Stable across snapshots for the same elements</p>
                  <p>• Agent uses UIDs to target specific elements</p>
                  <p>• UIDs are internal-only (never exposed to users)</p>
                </CardContent>
              </Card>
            </div>
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <p className="text-sm font-mono whitespace-pre text-muted-foreground">
{`// Example snapshot output the agent sees:
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
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" />
            Chrome DevTools Protocol
          </h2>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Prophet uses the <strong className="text-foreground">Chrome DevTools Protocol (CDP)</strong> - the same technology that powers Chrome DevTools. This provides low-level browser control.
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
                <p className="text-sm font-mono text-muted-foreground">
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
          <h2 className="text-2xl font-bold mb-8">Agent Tools ({agentTools.length} Available)</h2>
          <p className="text-muted-foreground mb-8">
            Claude has access to {agentTools.length} specialized tools for browser automation. Each tool is designed for a specific type of interaction:
          </p>
          {categories.map((category) => (
            <div key={category} className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-muted-foreground">{category}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {agentTools
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
            <Cpu className="h-6 w-6 text-primary" />
            Decision Making with Claude
          </h2>
          <div className="space-y-6">
            <p className="text-muted-foreground mb-4">
              Prophet uses <strong className="text-foreground">Anthropic Claude</strong> as the reasoning engine. Users can select from three Claude 4.5 models:
            </p>
            <div className="grid gap-3 md:grid-cols-3 mb-6">
              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-4">
                  <p className="font-semibold text-sm">Haiku 4.5</p>
                  <p className="text-xs text-muted-foreground mt-1">Fast & efficient for simple tasks</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-4">
                  <p className="font-semibold text-sm">Sonnet 4.5</p>
                  <p className="text-xs text-muted-foreground mt-1">Balanced performance & capability</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-4">
                  <p className="font-semibold text-sm">Opus 4.5</p>
                  <p className="text-xs text-muted-foreground mt-1">Most capable for complex tasks</p>
                </CardContent>
              </Card>
            </div>
            <p className="text-muted-foreground">
              Here's how Claude makes decisions:
            </p>
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">1. Context Analysis</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Claude receives your message, conversation history, and the current accessibility tree snapshot. It analyzes what you want to accomplish and what's visible on the page.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">2. Tool Selection</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Based on the task, Claude chooses which tools to use. For example, to fill a form it might: take_snapshot → search_snapshot for the form → fill_element_by_uid → click_element_by_uid to submit.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">3. Execution & Feedback</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Each tool returns results (success/failure, new page content, etc). Claude uses this feedback to decide the next action or determine if the task is complete.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">4. Error Recovery</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  If something fails (element not found, page changed unexpectedly), Claude can retry with different approaches, scroll to reveal content, or ask for clarification.
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

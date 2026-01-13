import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock, CodeBlockCopyButton } from '@/components/ai/code-block'
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
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            How Prophet's Agent Works
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A technical look at how our AI agent sees web pages, makes decisions, and automates browser tasks. Built with the <a href="https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Anthropic API with tool use</a> and a custom agent loop.
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
            <CodeBlock
              code={`// Example snapshot output the agent sees:
uid=Ab12Cd3E button "Submit" <button>
uid=Xy98Zw7V textbox "Email" value="user@example.com" <input>
  uid=Mn45Op6Q link "Forgot password?" <a>`}
              language="html"
            >
              <CodeBlockCopyButton />
            </CodeBlock>
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
            <CodeBlock
              code={`// Example: CDP command to click at coordinates
chrome.debugger.sendCommand(
  { tabId },
  'Input.dispatchMouseEvent',
  { type: 'mousePressed', x: 100, y: 200, button: 'left' }
)`}
              language="javascript"
            >
              <CodeBlockCopyButton />
            </CodeBlock>
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
                      <Card key={tool.name}>
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

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Architecture Overview
          </h2>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Prophet uses a <strong className="text-foreground">custom browser automation architecture</strong> built on the Anthropic API with tool use. The system has three main components:
            </p>
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">1. Chrome Extension</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Runs in your browser, manages the agent loop, and executes tools locally using Chrome DevTools Protocol.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">2. Backend API</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Handles authentication, rate limiting, and billing. Streams Claude's responses to the extension.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">3. Anthropic API</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Receives page context and returns intelligent actions (clicks, typing, navigation) for the browser.</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Why Accessibility Tree?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Unlike screenshot-based approaches (Computer Use, Claude in Chrome), Prophet uses the accessibility tree:</p>
                  <p>• <strong className="text-foreground">Fast</strong> - No image processing or vision models</p>
                  <p>• <strong className="text-foreground">Deterministic</strong> - UIDs target exact elements</p>
                  <p>• <strong className="text-foreground">Efficient</strong> - Less tokens than screenshots</p>
                  <p>• <strong className="text-foreground">Reliable</strong> - Same approach as Playwright MCP</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Why Custom Agent Loop?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Prophet implements its own agent loop instead of using Claude Agent SDK:</p>
                  <p>• <strong className="text-foreground">Browser Context</strong> - Tools run in your logged-in session</p>
                  <p>• <strong className="text-foreground">No Dependencies</strong> - No Claude Code CLI required</p>
                  <p>• <strong className="text-foreground">Full Control</strong> - Custom tool execution via CDP</p>
                  <p>• <strong className="text-foreground">Security</strong> - Tool execution isolated from backend</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Why Client-Side Tool Execution?
          </h2>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Prophet executes tools <strong className="text-foreground">inside your browser</strong> (client-side) rather than on a server. This is a critical design choice that enables browser automation.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">The Requirement</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Browser automation tools need access to the <strong className="text-foreground">Chrome DevTools Protocol (CDP)</strong> to:</p>
                  <p>• Control the browser (click, type, scroll)</p>
                  <p>• Read page state (accessibility tree, element properties)</p>
                  <p>• Manage tabs and navigation</p>
                  <p className="pt-2"><strong className="text-foreground">CDP is only available in Chrome extensions</strong> - not on backend servers.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">The Benefits</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Running tools in your browser means:</p>
                  <p>• <strong className="text-foreground">Your session, your control</strong> - Automation happens in your logged-in browser, not a separate instance</p>
                  <p>• <strong className="text-foreground">Security</strong> - Backend never sees what you're browsing</p>
                  <p>• <strong className="text-foreground">Privacy</strong> - Page content stays local to your machine</p>
                  <p>• <strong className="text-foreground">No dependencies</strong> - No separate browser instances needed</p>
                </CardContent>
              </Card>
            </div>
            <p className="text-sm text-muted-foreground">
              This architecture choice is what makes Prophet different from server-side tools like web scrapers or coding agents. For more details on when to use client-side vs server-side tool execution, see our{' '}
              <a
                href="https://github.com/ThanosKa/prophet/blob/main/ARCHITECTURE.md#why-client-side-tool-execution"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Architecture Guide
              </a>.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" />
            Prophet vs Claude in Chrome
          </h2>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Anthropic offers{' '}
              <a href="https://www.anthropic.com/news/claude-for-chrome" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                Claude in Chrome
              </a>
              , their official browser extension. Here's how Prophet's approach differs:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Feature</th>
                    <th className="text-left py-3 px-4 font-semibold">Claude in Chrome</th>
                    <th className="text-left py-3 px-4 font-semibold">Prophet</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium text-foreground">How it "sees" pages</td>
                    <td className="py-3 px-4">Screenshots (vision model)</td>
                    <td className="py-3 px-4">Accessibility tree (structured data)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium text-foreground">Speed</td>
                    <td className="py-3 px-4">"Noticeably slower" - screenshot/analyze cycle</td>
                    <td className="py-3 px-4">Fast - direct element targeting</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium text-foreground">Vision model</td>
                    <td className="py-3 px-4">Required</td>
                    <td className="py-3 px-4">Not needed</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium text-foreground">Element targeting</td>
                    <td className="py-3 px-4">Coordinate-based (probabilistic)</td>
                    <td className="py-3 px-4">UID-based (deterministic)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium text-foreground">Token usage</td>
                    <td className="py-3 px-4">High (images are expensive)</td>
                    <td className="py-3 px-4">Low (structured text)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-3 px-4 font-medium text-foreground">Infrastructure</td>
                    <td className="py-3 px-4">Anthropic's servers</td>
                    <td className="py-3 px-4">Your own backend (full control)</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-foreground">Billing</td>
                    <td className="py-3 px-4">Claude subscription ($20-200/mo)</td>
                    <td className="py-3 px-4">Pay-per-use credits</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Key insight:</strong> Prophet's accessibility tree approach is the same method used by{' '}
                  <a href="https://github.com/microsoft/playwright-mcp" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    Playwright MCP
                  </a>
                  , which states: "Rather than relying on screenshots, it generates structured accessibility snapshots... making interactions more deterministic and efficient."
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">Learn More</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="pt-6">
                <p className="font-medium mb-2">Anthropic API - Tool Use</p>
                <p className="text-sm text-muted-foreground mb-3">Official documentation on how Claude processes and executes tools.</p>
                <a
                  href="https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview"
                  className="text-sm text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  platform.claude.com →
                </a>
              </CardContent>
            </Card>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="pt-6">
                <p className="font-medium mb-2">Playwright MCP</p>
                <p className="text-sm text-muted-foreground mb-3">Microsoft's MCP server using the same accessibility tree approach.</p>
                <a
                  href="https://github.com/microsoft/playwright-mcp"
                  className="text-sm text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  github.com/microsoft/playwright-mcp →
                </a>
              </CardContent>
            </Card>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="pt-6">
                <p className="font-medium mb-2">Claude in Chrome</p>
                <p className="text-sm text-muted-foreground mb-3">Anthropic's official browser extension using screenshot-based approach.</p>
                <a
                  href="https://www.anthropic.com/news/claude-for-chrome"
                  className="text-sm text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  anthropic.com →
                </a>
              </CardContent>
            </Card>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="pt-6">
                <p className="font-medium mb-2">Chrome DevTools Protocol</p>
                <p className="text-sm text-muted-foreground mb-3">The low-level protocol Prophet uses for browser automation.</p>
                <a
                  href="https://chromedevtools.github.io/devtools-protocol/"
                  className="text-sm text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  chromedevtools.github.io →
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

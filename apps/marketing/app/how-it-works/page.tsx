import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Download,
  Shield,
  Eye,
  PlayCircle,
  StopCircle,
  FileText,
  Navigation,
  MousePointerClick,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How It Works | Prophet',
  description: 'Learn how Prophet accesses your browser, what permissions it needs, and how to use it safely.',
}

export default function HowItWorksPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <Header />

      <section className="py-20 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="outline" className="mb-4">User Guide</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            How Prophet Works
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about how Prophet accesses your browser, what it can do, and how to stay safe.
          </p>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Download className="h-6 w-6 text-primary" />
            Installation & Setup
          </h2>
          <div className="space-y-6">
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                Getting started with Prophet is simple. Install the Chrome extension from the Chrome Web Store,
                and it will add a side panel to your browser.
              </p>
            </div>
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>
                    Install the Extension
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Click "Add to Chrome" from the Web Store. The extension will install in seconds.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
                    Grant Permissions
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Prophet will ask for permission to access the current tab and use the Chrome debugger.
                  These permissions allow Prophet to see and interact with web pages on your behalf.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">3</span>
                    Sign In
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Click the extension icon to open the side panel. Sign in with your Prophet account to get started.
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" />
            Browser Access Explained
          </h2>
          <div className="space-y-6">
            <p className="text-muted-foreground">
              Prophet needs specific permissions to control your browser. Here's exactly what it can and cannot access:
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-green-500/20 bg-green-500/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Unlock className="h-5 w-5 text-green-500" />
                    What Prophet Can Access
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Page content (text, buttons, forms, links)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Current page URL and title</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Ability to click buttons and fill forms</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Navigation and scrolling control</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Tab management (open, close, switch)</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-500/20 bg-red-500/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lock className="h-5 w-5 text-red-500" />
                    What Prophet Cannot Access
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Saved passwords or autofill data</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Credit card information</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Browser history or bookmarks</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Other tabs or windows without permission</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">Files on your computer</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Chrome Debugger Permission:</strong> Prophet uses the Chrome DevTools
                  Protocol (the same technology Chrome DevTools uses) to interact with pages. This allows it to click buttons,
                  fill forms, and read page content—just like a human would.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <PlayCircle className="h-6 w-6 text-primary" />
            How to Use Prophet
          </h2>
          <div className="space-y-6">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">1. Open the Side Panel</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Click the Prophet icon in your Chrome toolbar. The side panel will slide out from the right side of your browser.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">2. Give a Command</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Type what you want Prophet to do. For example: "Fill out this form with my name and email" or
                  "Navigate to the pricing page and compare the plans."
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">3. Watch It Work</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Prophet will show you exactly what it's doing in real-time. You'll see a colored border around the browser
                  when Prophet is active, and it will narrate each action it takes.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">4. Stop Anytime</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Click the "Stop" button in the side panel to immediately halt execution. Prophet will stop all actions
                  and return control to you.</p>
                  <div className="flex items-center gap-2 pt-2">
                    <StopCircle className="h-4 w-4 text-destructive" />
                    <span className="text-xs font-medium text-destructive">The stop button is always visible during execution</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Privacy & Safety
          </h2>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">What Gets Sent to Claude</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>When you use Prophet, we send the following to Claude's API:</p>
                  <ul className="space-y-1 pl-4">
                    <li>• Your conversation messages</li>
                    <li>• The current page content Prophet can see</li>
                    <li>• Information about interactive elements (buttons, forms)</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">What's NOT Stored</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Prophet does not store:</p>
                  <ul className="space-y-1 pl-4">
                    <li>• Full conversation history (processed, not stored long-term)</li>
                    <li>• Page screenshots or recordings</li>
                    <li>• Sensitive form data (passwords, credit cards)</li>
                    <li>• Your browsing history</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            <Card className="bg-muted/30">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Revoking Access</h3>
                  <p className="text-sm text-muted-foreground">
                    You can revoke Prophet's permissions at any time by going to <code className="text-xs bg-muted px-1 py-0.5 rounded">chrome://extensions</code>,
                    finding Prophet, and clicking "Remove" or disabling specific permissions.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Automatic Safety Features</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                    <li>• Prophet auto-confirms before destructive actions (deleting, purchasing)</li>
                    <li>• Maximum 10 actions per conversation to prevent runaway behavior</li>
                    <li>• Debugger connection auto-closes after 30 seconds of inactivity</li>
                    <li>• Visual border shows when Prophet is actively controlling the browser</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8">Common Use Cases</h2>
          <p className="text-muted-foreground mb-8">
            Here are some things Prophet excels at—and a few it doesn't:
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader>
                <CardTitle className="text-base text-green-600 dark:text-green-400">Works Great</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Filling out forms with provided information</span>
                </div>
                <div className="flex items-start gap-2">
                  <Navigation className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Navigating multi-step workflows</span>
                </div>
                <div className="flex items-start gap-2">
                  <MousePointerClick className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Clicking through menus and buttons</span>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Extracting specific data from pages</span>
                </div>
                <div className="flex items-start gap-2">
                  <Navigation className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Comparing information across tabs</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="text-base text-yellow-600 dark:text-yellow-400">Limitations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>CAPTCHAs and anti-bot protections</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>Websites that require login credentials</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>Complex visual tasks (reading charts, images)</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>Highly dynamic single-page apps (may require retries)</span>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>Making purchases without explicit user confirmation</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

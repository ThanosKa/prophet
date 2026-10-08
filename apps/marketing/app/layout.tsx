import { ClerkThemeProvider } from '@/components/providers/ClerkThemeProvider'
import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { CheckoutProvider } from '@/hooks/use-checkout'
import { graphJsonLd, organizationNode, websiteNode } from '@/lib/structured-data'
import './globals.css'

const HOME_TITLE = 'Claude AI Sidebar for Chrome: Pay Per Use | Prophet'
const HOME_DESCRIPTION =
  "Run Claude Haiku, Sonnet and Opus 5.5 in your Chrome side panel — it reads and acts on the page you're on. $0.20 free credits, no card."

export const metadata: Metadata = {
  title: {
    default: HOME_TITLE,
    template: '%s | Prophet'
  },
  description: HOME_DESCRIPTION,
  metadataBase: new URL('https://prophetchrome.com'),
  keywords: ['claude chrome extension', 'ai sidebar chrome extension', 'ai side panel', 'browser automation', 'claude ai free'],
  authors: [{ name: 'Thanos Kazakis' }],
  creator: 'Thanos Kazakis',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://prophetchrome.com',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    siteName: 'Prophet',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Prophet AI Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: ['/og-image.png'],
    creator: '@prophet_ai',
  },
  alternates: {
    canonical: '/',
  },
  verification: {
    google: '-6--jvDqz2VOp0cUY_i_biGKl9sy8ENoQFcZ95kt1fs',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkThemeProvider>
      <html lang="en" suppressHydrationWarning className="scroll-smooth">
        <body className="antialiased">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(graphJsonLd([organizationNode, websiteNode])),
            }}
          />
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <CheckoutProvider>
              {children}
            </CheckoutProvider>
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkThemeProvider>
  )
}

import { ClerkThemeProvider } from '@/components/providers/ClerkThemeProvider'
import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { CheckoutProvider } from '@/hooks/use-checkout'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Prophet - AI Assistant Chrome Extension',
    template: '%s | Prophet'
  },
  description: 'Your AI-powered assistant right in your browser. Boost productivity with intelligent web interactions.',
  metadataBase: new URL('https://prophetchrome.com'),
  keywords: ['AI assistant', 'Chrome extension', 'productivity', 'web automation', 'artificial intelligence'],
  authors: [{ name: 'Prophet Team' }],
  creator: 'Prophet Team',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://prophetchrome.com',
    title: 'Prophet - AI Assistant Chrome Extension',
    description: 'Your AI-powered assistant right in your browser. Boost productivity with intelligent web interactions.',
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
    title: 'Prophet - AI Assistant Chrome Extension',
    description: 'Your AI-powered assistant right in your browser. Boost productivity with intelligent web interactions.',
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
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'Prophet',
                url: 'https://prophetchrome.com',
                logo: 'https://prophetchrome.com/logo.svg',
                description:
                  'AI-powered Chrome extension that brings Claude AI directly to your browser\'s side panel for chat, browser automation, and web page analysis.',
                foundingDate: '2025',
                sameAs: [
                  'https://x.com/KazakisThanos',
                  'https://github.com/ThanosKa/prophet',
                  'https://discord.gg/2YV53RbS',
                ],
              }),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'Prophet',
                url: 'https://prophetchrome.com',
                description:
                  'AI-powered Chrome extension with streaming Claude AI chat, browser automation, and pay-per-use pricing.',
                publisher: {
                  '@type': 'Organization',
                  name: 'Prophet',
                },
              }),
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

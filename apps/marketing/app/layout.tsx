import { ClerkThemeProvider } from '@/components/providers/ClerkThemeProvider'
import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import './globals.css'

export const metadata: Metadata = {
  title: 'Prophet - AI Assistant Chrome Extension',
  description: 'Your AI-powered assistant right in your browser',
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.png',
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
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkThemeProvider>
  )
}

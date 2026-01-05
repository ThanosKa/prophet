import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import './globals.css'

export const metadata: Metadata = {
  title: 'Prophet - AI Assistant Chrome Extension',
  description: 'Your AI-powered assistant right in your browser',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: 'oklch(0.62 0.14 39.04)',
          borderRadius: '0.65rem',
        },
        elements: {
          card: 'bg-background border border-border shadow-lg',
          headerTitle: 'text-foreground',
          headerSubtitle: 'text-muted-foreground',
          formFieldLabel: 'text-foreground',
          formFieldInput: 'bg-input border-border text-foreground',
          footerActionLink: 'text-primary hover:text-primary/80',
          formButtonPrimary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
          socialButtonsBlockButton: 'bg-secondary border-border text-secondary-foreground hover:bg-accent',
          dividerLine: 'bg-border',
          dividerText: 'text-muted-foreground',
          identityPreview: 'bg-muted border-border',
          identityPreviewText: 'text-foreground',
          identityPreviewEditButton: 'text-primary',
          userButtonPopoverCard: 'bg-background border border-border',
          userButtonPopoverActionButton: 'text-foreground hover:bg-accent',
          userButtonPopoverActionButtonText: 'text-foreground',
          userButtonPopoverFooter: 'hidden',
        },
      }}
    >
      <html lang="en" suppressHydrationWarning className="scroll-smooth">
        <body className="antialiased">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}

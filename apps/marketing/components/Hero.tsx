import { SignInButton, SignUpButton, SignedOut, SignedIn } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function Hero() {
  return (
    <section className="flex-1 flex items-center justify-center py-20 px-4 bg-gradient-to-br from-background to-muted">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-6">AI Assistant Right in Your Browser</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Prophet brings Claude&apos;s intelligence directly to your browser with a sleek side panel.
          Chat, analyze, and create without leaving your workflow.
        </p>
        <div className="flex gap-4 justify-center">
          <SignedOut>
            <SignUpButton mode="modal">
              <Button size="lg" className="px-8">
                Get Started Free
              </Button>
            </SignUpButton>
            <SignInButton mode="modal">
              <Button size="lg" variant="outline" className="px-8">
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="https://chrome.google.com/webstore">
              <Button size="lg" className="px-8">
                Add to Chrome
              </Button>
            </Link>
          </SignedIn>
        </div>
      </div>
    </section>
  )
}

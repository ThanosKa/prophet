import { SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/account/UserMenu'

export function Header() {
  return (
    <header className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="text-2xl font-bold">Prophet</div>
        <nav className="flex items-center gap-4">
          <a href="/#features" className="text-sm hover:text-muted-foreground transition-colors">
            Features
          </a>
          <a href="/#pricing" className="text-sm hover:text-muted-foreground transition-colors">
            Pricing
          </a>
          <SignedOut>
            <SignInButton mode="modal">
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserMenu />
          </SignedIn>
        </nav>
      </div>
    </header>
  )
}

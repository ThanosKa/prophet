'use client'

import { SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { Menu } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { UserMenu } from '@/components/account/UserMenu'
import { ThemeToggle } from '@/components/ThemeToggle'

export function Header() {
  const [open, setOpen] = useState(false)

  const navigation = [
    { name: 'Features', href: '/#features' },
    { name: 'How It Works', href: '/how-it-works' },
    { name: 'Pricing', href: '/#pricing' },
    { name: 'FAQ', href: '/#faq' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <img src="/logo.svg" alt="Prophet Logo" className="w-8 h-8 object-contain" />
          Prophet
        </Link>

        <nav className="hidden md:flex items-center gap-6 absolute left-1/2 -translate-x-1/2">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="text-sm font-medium hover:text-muted-foreground transition-colors"
            >
              {item.name}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/account">
              <Button size="sm">Sign In</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserMenu />
          </SignedIn>
        </div>

        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <SignedIn>
            <UserMenu />
          </SignedIn>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-4 mt-8">
                {navigation.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="text-lg font-medium hover:text-muted-foreground transition-colors"
                  >
                    {item.name}
                  </a>
                ))}
                <SignedOut>
                  <SignInButton mode="modal" forceRedirectUrl="/account">
                    <Button className="w-full mt-4">Sign In</Button>
                  </SignInButton>
                </SignedOut>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

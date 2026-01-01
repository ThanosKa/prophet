'use client'

import { SignInButton, SignUpButton, SignedOut, SignedIn } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { BGPattern } from './BGPattern'

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background -z-10" />
      <BGPattern variant="grid" mask="fade-edges" size={64} className="-z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Badge variant="outline" className="mb-4">
                <Sparkles className="h-3 w-3 mr-1" />
                Now with Claude Sonnet 4.5
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
            >
              AI Assistant Right in Your Browser
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0"
            >
              Prophet brings Claude&apos;s intelligence directly to your browser with a sleek side panel. Chat, analyze, and create without leaving your workflow.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <SignedOut>
                <SignUpButton mode="modal" forceRedirectUrl="/account">
                  <Button size="lg" className="px-8">
                    Get Started Free
                  </Button>
                </SignUpButton>
                <SignInButton mode="modal" forceRedirectUrl="/account">
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
                <Link href="/account">
                  <Button size="lg" variant="outline" className="px-8">
                    Dashboard
                  </Button>
                </Link>
              </SignedIn>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-8 text-sm text-muted-foreground"
            >
              Join 1,000+ users already using Prophet
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <div className="aspect-video rounded-lg border bg-muted/50 backdrop-blur flex items-center justify-center">
              <p className="text-muted-foreground">Product Screenshot Placeholder</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

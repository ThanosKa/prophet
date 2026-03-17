'use client'

import { SignUpButton, SignedOut, SignedIn } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { CHROME_STORE_URL } from '@/lib/constants'

export function CTASection() {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/10 -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Start Using Claude in Your Browser
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Prophet puts Claude AI directly in your Chrome side panel. Chat with AI, automate repetitive tasks, and get work done faster on any webpage. No credit card required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignedOut>
              <Link href={CHROME_STORE_URL}>
                <Button size="lg" className="px-8">
                  Add to Chrome
                </Button>
              </Link>
              <SignUpButton mode="modal">
                <Button size="lg" variant="outline" className="px-8">
                  Create Account
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/pricing">
                <Button size="lg" className="px-8">
                  View Plans
                </Button>
              </Link>
            </SignedIn>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

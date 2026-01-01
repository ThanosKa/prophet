'use client'

import { SignUpButton, SignedOut, SignedIn } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import Link from 'next/link'

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
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already experiencing the power of AI right in their browser. Start with our free plan today.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignedOut>
              <SignUpButton mode="modal">
                <Button size="lg" className="px-8">
                  Start Free Trial
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/account/billing">
                <Button size="lg" className="px-8">
                  View Plans
                </Button>
              </Link>
            </SignedIn>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="px-8">
                Contact Sales
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

"use client";

import { SignInButton, SignUpButton, SignedOut, SignedIn } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { BGPattern } from "./BGPattern";

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background -z-10" />
      <BGPattern variant="grid" mask="fade-edges" size={64} className="-z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-4 flex justify-center"
            >
              <Link
                href="https://github.com/ThanosKa/prophet"
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-full border border-black/10 bg-neutral-100 text-base transition-all ease-in hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-800 dark:hover:bg-neutral-800"
              >
                <AnimatedShinyText className="inline-flex items-center justify-center px-4 py-1 text-sm transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
                  <span>✨ Introducing Prophet</span>
                  <ArrowRight className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
                </AnimatedShinyText>
              </Link>
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
              className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            >
              Prophet brings Claude&apos;s intelligence directly to your browser
              with a sleek side panel. Chat, analyze, and create without leaving
              your workflow.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
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
            transition={{ duration: 0.6, delay: 0.5 }}
            className="relative mt-16 w-full max-w-4xl"
          >
            <div className="aspect-video rounded-xl border bg-muted/50 backdrop-blur flex items-center justify-center shadow-lg">
              <p className="text-muted-foreground">
                Product Screenshot Placeholder
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

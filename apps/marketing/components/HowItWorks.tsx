'use client'

import { motion } from 'framer-motion'
import { Download, LogIn, MessageSquare } from 'lucide-react'

const steps = [
  {
    number: 1,
    title: 'Install Extension',
    description: 'Add Prophet to your Chrome browser from the Web Store in just one click.',
    icon: Download,
  },
  {
    number: 2,
    title: 'Sign In',
    description: 'Authenticate securely with your account and choose your plan.',
    icon: LogIn,
  },
  {
    number: 3,
    title: 'Start Chatting',
    description: 'Open the side panel and start chatting with Claude AI instantly.',
    icon: MessageSquare,
  },
]

export function HowItWorks() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get started with Prophet in three simple steps
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-4">
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-muted border-2 border-primary text-sm font-bold flex items-center justify-center mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

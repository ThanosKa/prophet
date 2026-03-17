'use client'

import { motion } from 'framer-motion'
import { Globe, MousePointerClick, Cpu, CreditCard, Shield, MessageSquare } from 'lucide-react'

const features = [
  {
    title: 'AI on Every Webpage',
    description: 'Open Prophet on any site. Get answers, summaries, and help without switching tabs or copy-pasting.',
    icon: Globe,
  },
  {
    title: 'Browser Automation with AI',
    description: 'Prophet can fill forms, click buttons, extract data, and navigate pages using 18 built-in browser tools.',
    icon: MousePointerClick,
  },
  {
    title: 'All Claude Models',
    description: 'Choose Haiku 4.5 for speed, Sonnet 4.6 for balance, or Opus 4.6 for the most complex tasks.',
    icon: Cpu,
  },
  {
    title: 'Pay Only for What You Use',
    description: 'No flat monthly fee wasted on unused capacity. Credits map directly to API costs with full transparency.',
    icon: CreditCard,
  },
  {
    title: 'Your Data Stays Private',
    description: 'Page content is processed locally. Only your messages reach Claude. Enterprise-grade encryption throughout.',
    icon: Shield,
  },
  {
    title: 'Persistent Chat History',
    description: 'Every conversation is saved. Pick up where you left off across sessions.',
    icon: MessageSquare,
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 px-4 bg-muted/50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Professionals Choose Prophet</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The only Chrome extension that gives you a personal AI agent capable of reading, clicking, and navigating any webpage.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                className="p-6 rounded-lg bg-card border transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

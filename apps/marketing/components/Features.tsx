'use client'

import { motion } from 'framer-motion'
import { Zap, MessageSquare, History, Shield, CreditCard, Crown } from 'lucide-react'

const features = [
  {
    title: 'Always Available',
    description: 'Access Claude from any website without leaving your browser',
    icon: Zap,
  },
  {
    title: 'Streaming Responses',
    description: 'See AI responses stream in real-time as they are generated',
    icon: MessageSquare,
  },
  {
    title: 'Chat History',
    description: 'Keep track of all your conversations with persistent storage',
    icon: History,
  },
  {
    title: 'Secure Authentication',
    description: 'Your data is protected with Clerk authentication and secure APIs',
    icon: Shield,
  },
  {
    title: 'Token-Based Credits',
    description: 'Pay only for what you use with our transparent credit system',
    icon: CreditCard,
  },
  {
    title: 'Multiple Tiers',
    description: 'Choose the plan that fits your needs - from Free to Ultra',
    icon: Crown,
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
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Features</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need for a seamless AI-powered browsing experience
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

'use client'

import { motion } from 'framer-motion'
import { Quote } from 'lucide-react'

const testimonials = [
  {
    quote: 'Prophet replaced my Claude Pro subscription. The pay-per-use model saves me money and the browser automation is something Claude.ai simply cannot do.',
    name: 'Alex M.',
    role: 'Software Engineer',
  },
  {
    quote: 'I use Prophet daily for research. The side panel means I never lose context when switching between sources.',
    name: 'Sarah K.',
    role: 'Product Manager',
  },
  {
    quote: 'The browser automation tools are a game changer. I automate form filling and data extraction tasks that used to take hours.',
    name: 'James R.',
    role: 'Data Analyst',
  },
]

export function Testimonials() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">What Users Are Saying</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Professionals trust Prophet to bring AI into their daily workflow.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-6 rounded-lg bg-card border"
            >
              <Quote className="h-6 w-6 text-primary/40 mb-4" />
              <p className="text-muted-foreground mb-6 leading-relaxed">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div>
                <p className="font-semibold">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

'use client'

import { motion } from 'framer-motion'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqs = [
  {
    question: 'How does my balance work?',
    answer: 'Your balance is consumed based on AI API usage. Token usage is tracked and charged at competitive rates with a small service fee. You only pay for what you use.',
  },
  {
    question: 'Can I use Prophet without a subscription?',
    answer: 'Yes! The Free plan includes $0.50 in balance to get started. You can upgrade anytime for more balance and features.',
  },
  {
    question: 'How do I install the Chrome extension?',
    answer: 'Visit the Chrome Web Store, search for "Prophet", and click "Add to Chrome". After installation, sign in with your account.',
  },
  {
    question: 'What happens when I run out of balance?',
    answer: 'You\'ll receive a notification when your balance is low. You can upgrade your plan or purchase additional balance in your account dashboard.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. All communication is encrypted, and we never store your chat contents. Your data is processed securely through Anthropic\'s API.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Absolutely. You can cancel your subscription at any time from your account settings. You\'ll retain access until the end of your billing period.',
  },
  {
    question: 'Which AI model does Prophet use?',
    answer: 'Prophet uses Claude Sonnet 4.5, Anthropic\'s latest and most capable model, providing fast and intelligent responses.',
  },
  {
    question: 'Does my balance roll over?',
    answer: 'Your balance resets monthly with your subscription. Make sure to use your allocation before the end of each billing period.',
  },
]

export function FAQ() {
  return (
    <section id="faq" className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about Prophet
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  )
}

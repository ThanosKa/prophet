export interface FAQ {
  question: string
  answer: string
}

export const homeFaqs: FAQ[] = [
  {
    question: 'Is there a free version?',
    answer:
      'Yes. Prophet includes a free plan with $0.20 in credits — enough for roughly 50 messages with Haiku or 10 with Sonnet. No credit card required.',
  },
  {
    question: 'How is Prophet different from ChatGPT or Claude.ai?',
    answer:
      'Prophet lives inside your browser as a side panel. It can see and interact with the webpage you are on — filling forms, clicking buttons, extracting data, and navigating pages using 18 built-in tools. It is not just a chatbot; it is a browser automation agent powered by Claude AI.',
  },
  {
    question: 'How do credits work?',
    answer:
      'Your credits are consumed based on the AI tokens used in each conversation. Different Claude models have different per-token costs — Haiku is the most affordable, Opus is the most capable. You can see exact costs in your account dashboard.',
  },
  {
    question: 'Can I use Prophet without a subscription?',
    answer:
      'Yes. The Free plan includes $0.20 in credits to get started. You can also purchase a one-time $10 credit top-up without any subscription. Upgrade anytime for more credits and bonus value.',
  },
  {
    question: 'How do I install the Chrome extension?',
    answer:
      'Visit the Chrome Web Store, search for "Prophet", and click "Add to Chrome". After installation, sign in with your account.',
  },
  {
    question: 'What happens when I run out of balance?',
    answer:
      "You'll receive a notification when your balance is low. You can upgrade your plan or purchase additional balance in your account dashboard.",
  },
  {
    question: 'Is my data secure?',
    answer:
      'Yes. All communication is encrypted in transit and at rest. Your browsing data stays on your machine — our servers only process the messages you send to Claude. We use enterprise-grade Clerk authentication and Stripe payment processing.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer:
      "Absolutely. You can cancel your subscription at any time from your account settings. You'll retain access until the end of your billing period.",
  },
  {
    question: 'Which AI model does Prophet use?',
    answer:
      'Prophet supports all Claude models including Claude 4.5 Haiku, Claude 4.6 Sonnet, and Claude 4.6 Opus. You can select any model you prefer at standard Anthropic pricing.',
  },
  {
    question: 'Does my balance roll over?',
    answer:
      'Your balance resets monthly with your subscription. Make sure to use your allocation before the end of each billing period.',
  },
]

export function faqPageJsonLd(faqs: FAQ[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}

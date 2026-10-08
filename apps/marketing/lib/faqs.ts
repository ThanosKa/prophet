export interface FAQ {
  question: string
  answer: string
}

export const homeFaqs: FAQ[] = [
  {
    question: 'Is there a free version?',
    answer:
      'Yes. Every new account gets a one-time $0.07 in free credits, enough to try Prophet on Claude Haiku. No credit card required.',
  },
  {
    question: 'How is Prophet different from ChatGPT or Claude.ai?',
    answer:
      'Prophet lives inside your browser as a side panel. It can see and interact with the webpage you are on — filling forms, clicking buttons, extracting data, and navigating pages using 18 built-in tools. It is not just a chatbot; it is a browser automation agent powered by Claude AI.',
  },
  {
    question: 'How do credits work?',
    answer:
      'Credits are pay-per-use: 1 credit is 1 cent, and each Turn (one call to Claude while the agent works on your message) is charged by the tokens it uses. Different Claude models have different per-token costs — Haiku is the most affordable, Opus is the most capable. You can see what you spent each day in your account dashboard.',
  },
  {
    question: 'Can I use Prophet without a subscription?',
    answer:
      'Yes. The Free plan includes a one-time $0.07 in credits to get started. You can also buy $10 of credits once, without any subscription, and those credits never expire. Upgrade anytime for monthly credits.',
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
      'Prophet supports Claude Haiku 5.5, Claude Sonnet 5.5 and Claude Opus 5.5. You pick the model for each conversation, and each one is charged at its own per-token rate.',
  },
  {
    question: 'Do my credits expire?',
    answer:
      'It depends on how you got them. The free credits are a one-time grant on sign-up. Subscription credits renew monthly and do not roll over: each renewal resets them to your plan amount. Purchased credits never expire; they stay in your balance through renewals, plan changes and cancellation. Subscription credits are spent first, so the credits that never expire last longest.',
  },
  {
    question: 'Is there a minimum charge per message?',
    answer:
      'Yes. Every Turn, one call to Claude, costs at least 1 credit (1 cent), however few tokens it used. One message can take several Turns when the agent reads a page, clicks or fills a form, so a short reply on Haiku usually costs 1 credit and a browser task costs a few.',
  },
]

export function faqNode(faqs: FAQ[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}

export function faqPageJsonLd(faqs: FAQ[]) {
  return { '@context': 'https://schema.org', ...faqNode(faqs) }
}

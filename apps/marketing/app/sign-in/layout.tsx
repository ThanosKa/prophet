import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Prophet account.',
  robots: { index: false, follow: false },
}

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children
}

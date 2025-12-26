export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  clerkPublishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '',
  isDevelopment: import.meta.env.DEV,
} as const

export default config

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  syncHost: import.meta.env.VITE_SYNC_HOST || 'http://localhost:3000',
  clerkPublishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '',
  isDevelopment: import.meta.env.DEV,
  // Set VITE_USE_DEV_API=true in .env to bypass credits during development
  useDevApi: import.meta.env.VITE_USE_DEV_API === 'true',
} as const

export default config

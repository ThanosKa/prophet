export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  clerkPublishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '',
  isDevelopment: import.meta.env.DEV,
  // Set VITE_USE_DEV_API=true for dev API (no credit deduction)
  // Set VITE_USE_DEV_API=mock for fully mocked responses (no API calls)
  useDevApi: import.meta.env.VITE_USE_DEV_API === 'true',
  useMockApi: import.meta.env.VITE_USE_DEV_API === 'mock',
} as const

export default config

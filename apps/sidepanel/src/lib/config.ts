export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'https://prophetchrome.com',
  clerkPublishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '',
  clerkSyncHost: import.meta.env.VITE_CLERK_SYNC_HOST || import.meta.env.VITE_API_URL || 'https://prophetchrome.com',
  isDevelopment: import.meta.env.DEV,
  useDevApi: import.meta.env.VITE_USE_DEV_API === 'true',
  useMockApi: import.meta.env.VITE_USE_DEV_API === 'mock',
  extensionId: import.meta.env.VITE_EXTENSION_ID || chrome.runtime.id,
} as const

export default config

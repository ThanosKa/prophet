import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { ClerkProvider } from '@clerk/chrome-extension'
import { dark } from '@clerk/themes'
import { config } from '@/lib/config'
import App from './App'
import './globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 minutes - data considered fresh
      gcTime: 1000 * 60 * 30,        // 30 minutes - keep in cache
      refetchOnWindowFocus: false,   // User controls refresh
      refetchOnReconnect: true,      // Refetch after network recovery
      retry: 2,                      // Retry failed requests twice
    },
  },
})

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={config.clerkPublishableKey}
      syncHost={config.clerkSyncHost}
      appearance={{
        baseTheme: dark,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ClerkProvider>
  </React.StrictMode>
)

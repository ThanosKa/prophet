---
name: clerk-auth
description: Authentication with Clerk across Next.js backend, marketing site, and Chrome extension. Use when implementing auth flows, protecting routes, accessing user data, or managing subscription tiers.
---

# Clerk Authentication

## When to Use
- Setting up authentication
- Protecting API routes
- Accessing user data
- Managing subscription tiers
- Chrome extension auth flow

## Next.js Backend Setup

### middleware.ts
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/api/webhooks/(.*)',
  '/api/health',
])

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### API Route Auth
```typescript
// app/api/chat/route.ts
import { auth, currentUser } from '@clerk/nextjs/server'

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Get full user object if needed
  const user = await currentUser()
  const tier = user?.publicMetadata?.tier as string || 'free'

  // ... rest of handler
}
```

### Webhook for User Sync
```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  const payload = await request.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svixId!,
      'svix-timestamp': svixTimestamp!,
      'svix-signature': svixSignature!,
    }) as WebhookEvent
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  if (evt.type === 'user.created') {
    await db.insert(users).values({
      id: evt.data.id,
      email: evt.data.email_addresses[0]?.email_address ?? '',
      tier: 'free',
      creditsRemaining: 50000,
    })
  }

  if (evt.type === 'user.deleted') {
    await db.delete(users).where(eq(users.id, evt.data.id!))
  }

  return new Response('OK', { status: 200 })
}
```

## Chrome Extension Auth

### Setup @clerk/chrome-extension
```typescript
// src/main.tsx
import { ClerkProvider } from '@clerk/chrome-extension'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    <App />
  </ClerkProvider>
)
```

### Auth Components in Extension
```typescript
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/chrome-extension'

export function Header() {
  return (
    <header className="flex items-center justify-between p-4">
      <h1>Prophet</h1>
      <SignedIn>
        <UserButton />
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <Button>Sign In</Button>
        </SignInButton>
      </SignedOut>
    </header>
  )
}
```

### Get Token for API Calls
```typescript
import { useAuth } from '@clerk/chrome-extension'

export function useApi() {
  const { getToken } = useAuth()

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const token = await getToken()

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
  }

  return { fetchWithAuth }
}
```

## Marketing Site Auth

### Sign In Page
```typescript
// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  )
}
```

### Protected Page
```typescript
// app/dashboard/page.tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return <Dashboard />
}
```

## Subscription Tiers

### Set Tier (after payment)
```typescript
import { clerkClient } from '@clerk/nextjs/server'

async function updateUserTier(userId: string, tier: 'pro' | 'premium' | 'ultra') {
  const client = await clerkClient()
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { tier },
  })
}
```

### Check Tier in API
```typescript
import { currentUser } from '@clerk/nextjs/server'

export async function POST(request: Request) {
  const user = await currentUser()
  const tier = (user?.publicMetadata?.tier as string) || 'free'

  const limits = {
    free: 50000,
    pro: 500000,
    premium: 1500000,
    ultra: 3000000,
  }

  // Use tier-based limits
}
```

## Environment Variables
```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Extension .env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## Anti-Patterns
- Never expose CLERK_SECRET_KEY to client
- Don't store sensitive user data in publicMetadata
- Avoid calling currentUser() when only userId needed
- Don't forget webhook signature verification

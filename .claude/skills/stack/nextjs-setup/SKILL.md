---
name: nextjs-architecture
description: Architecture patterns for scalable Next.js applications. Use when structuring files, routes, or deciding server/client boundaries.
---

# Next.js Architecture Patterns

## File Organization (Colocation)
```
app/
├── (auth)/              # Route group (doesn't affect URL)
│   ├── sign-in/
│   │   └── page.tsx
│   └── sign-up/
│       └── page.tsx
├── api/
│   ├── chat/
│   │   └── route.ts    # POST /api/chat
│   └── chats/
│       ├── route.ts    # GET /api/chats
│       └── [id]/
│           └── route.ts # GET /api/chats/[id]
├── dashboard/
│   ├── page.tsx        # /dashboard
│   ├── layout.tsx      # Shared layout
│   ├── loading.tsx     # Loading UI
│   ├── error.tsx       # Error boundary
│   └── components/     # ✅ GOOD - Colocate components
│       └── stats.tsx
├── components/          # Shared components
└── lib/                 # Utilities, db, etc.
```

**Principle**: Colocate components with routes when possible

## Server vs Client Boundaries
**Rule**: Keep the boundary as low as possible in the tree

```typescript
// ✅ GOOD - Provider at root, server components below
// app/layout.tsx
import { Providers } from './providers' // Client

export default function RootLayout({ children }: Props) {
  return (
    <html>
      <body>
        <Providers>
          {children} {/* Server Components can be here */}
        </Providers>
      </body>
    </html>
  )
}

// app/providers.tsx
'use client'
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// ❌ BAD - 'use client' at root
// app/layout.tsx
'use client' // Now ENTIRE app is client-rendered!

export default function RootLayout({ children }: Props) {
  return <html><body>{children}</body></html>
}
```

## When to Use Each Component Type
```typescript
// ✅ Server Component - Data fetching, DB access, static content
export async function ChatList({ userId }: Props) {
  const chats = await db.query.chats.findMany({
    where: eq(chats.userId, userId)
  })
  return <div>{chats.map(chat => <ChatCard chat={chat} />)}</div>
}

// ✅ Client Component - Interactivity, state, effects, browser APIs
'use client'
export function ChatInput() {
  const [message, setMessage] = useState('')
  const handleSubmit = () => {
    // Browser API
    navigator.clipboard.writeText(message)
  }
  return <input value={message} onChange={e => setMessage(e.target.value)} />
}

// ✅ Client Component - Event listeners
'use client'
export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  return <aside onClick={() => setIsOpen(!isOpen)}>{/* ... */}</aside>
}
```

## Data Fetching Patterns
```typescript
// ✅ GOOD - Server Component data fetching
export async function Page() {
  const data = await db.query.users.findMany() // Direct DB access
  return <UserList users={data} />
}

// ✅ GOOD - Parallel data fetching
async function Page() {
  const [users, chats] = await Promise.all([
    db.query.users.findMany(),
    db.query.chats.findMany(),
  ])
  return <Dashboard users={users} chats={chats} />
}

// ✅ GOOD - Client Component with TanStack Query
'use client'
import { useQuery } from '@tanstack/react-query'

export function ChatHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: () => fetch('/api/chats').then(r => r.json()),
  })

  if (isLoading) return <Spinner />
  return <ChatList chats={data} />
}

// ❌ BAD - Server Component with useEffect
export function ChatList() {
  useEffect(() => {}, []) // Error! Server Components can't use hooks
}
```

## Route Handlers (API Routes)
```typescript
// ✅ GOOD - Proper route handler structure
// app/api/chat/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  // 1. Authenticate
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Validate input
  const body = await request.json()
  const parsed = createChatSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error }, { status: 400 })
  }

  // 3. Business logic
  const chat = await createChat(userId, parsed.data)

  // 4. Return response
  return Response.json(chat, { status: 201 })
}

// ❌ BAD - Missing validation/auth
export async function POST(request: NextRequest) {
  const body = await request.json()
  const chat = await db.insert(chats).values(body) // No validation!
  return Response.json(chat)
}
```

## Dynamic Routes
```typescript
// ✅ GOOD - Dynamic route with proper typing
// app/chats/[chatId]/page.tsx
export async function Page({
  params,
}: {
  params: Promise<{ chatId: string }> // Next.js 15+ - params is a Promise
}) {
  const { chatId } = await params
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  })

  if (!chat) {
    notFound() // Renders not-found.tsx
  }

  return <ChatDetail chat={chat} />
}

// ❌ BAD - Not awaiting params (Next.js 15+)
export async function Page({ params }: { params: { chatId: string } }) {
  // Error in Next.js 15+
}
```

## Loading and Error States
```typescript
// ✅ GOOD - loading.tsx for loading UI
// app/dashboard/loading.tsx
export default function Loading() {
  return <Skeleton />
}

// ✅ GOOD - error.tsx for error boundary
// app/dashboard/error.tsx
'use client' // Error boundaries must be Client Components

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

## Metadata for SEO
```typescript
// ✅ GOOD - Static metadata
// app/page.tsx
export const metadata = {
  title: 'Prophet - AI Chat Assistant',
  description: 'Your AI-powered sidebar assistant',
}

// ✅ GOOD - Dynamic metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ chatId: string }>
}): Promise<Metadata> {
  const { chatId } = await params
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  })

  return {
    title: chat?.title ?? 'Chat',
    description: `Chat conversation: ${chat?.title}`,
  }
}
```

## Server Actions Pattern
```typescript
// ✅ GOOD - Server Action in separate file
// app/actions/chat.ts
'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

export async function createChat(formData: FormData) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const title = formData.get('title') as string
  const chat = await db.insert(chats).values({ userId, title })

  revalidatePath('/dashboard')
  return chat
}

// ✅ GOOD - Using Server Action in Client Component
'use client'
import { createChat } from './actions/chat'

export function NewChatForm() {
  return (
    <form action={createChat}>
      <input name="title" />
      <button type="submit">Create</button>
    </form>
  )
}
```

## Middleware Patterns
```typescript
// ✅ GOOD - Proper middleware structure
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

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

## Caching Strategy
```typescript
// ✅ GOOD - Proper cache control
export const dynamic = 'force-dynamic' // No caching (for user-specific data)
export const revalidate = 60 // Revalidate every 60 seconds

// ✅ GOOD - Opt out of caching for specific fetch
const data = await fetch(url, { cache: 'no-store' })

// ✅ GOOD - Revalidate on-demand
import { revalidatePath, revalidateTag } from 'next/cache'

await revalidatePath('/dashboard')
await revalidateTag('chats')
```

## Anti-Patterns to Avoid
- ❌ 'use client' at top of layout (entire tree becomes client)
- ❌ Fetching data in Client Components (use Server Components)
- ❌ Using useEffect for data fetching (use Server Components or React Query)
- ❌ Not awaiting params in Next.js 15+
- ❌ Missing error.tsx/loading.tsx in routes
- ❌ Importing Server Components in Client Components
- ❌ Using environment variables in Client Components (prefix with NEXT_PUBLIC_)

## Quick Checklist
- [ ] Server Components for data fetching
- [ ] Client Components only for interactivity
- [ ] 'use client' boundary as low as possible
- [ ] Collocate components with routes
- [ ] loading.tsx and error.tsx for all routes
- [ ] Metadata for SEO
- [ ] Middleware for auth/protection
- [ ] Proper cache strategy

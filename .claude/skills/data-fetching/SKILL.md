---
name: data-fetching
description: Data fetching patterns for React applications. Use when implementing data fetching, caching, or state management for server data.
---

# Data Fetching Patterns

## Core Principle: Single Source of Truth

**Server data** (from API) and **client state** (UI-only) should be managed separately:

| Data Type | Tool | Examples |
|-----------|------|----------|
| **Server data** | TanStack Query | User profile, chats, messages, API responses |
| **Client state** | Zustand/useState | Selected item, sidebar open, theme, form inputs |

## Anti-Pattern: Dual State

```typescript
// ❌ BAD - Syncing server data to Zustand
const { data } = useQuery({
  queryKey: ['chats'],
  queryFn: async () => {
    const response = await api.getChats()
    setChats(response.data)  // ← Copying to Zustand creates dual state
    return response.data
  },
})

// Components read from Zustand (bypasses Query cache)
const { chats } = useChatStore()
```

```typescript
// ✅ GOOD - Single source of truth
const { data: chats } = useQuery({
  queryKey: ['chats'],
  queryFn: () => api.getChats(),
})

// Components use Query data directly
return <ChatList chats={chats} />
```

## TanStack Query Configuration

### QueryClient Defaults

```typescript
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
```

### Stale Time Guidelines

| Data Type | Stale Time | Rationale |
|-----------|------------|-----------|
| User profile | 5-10 min | Rarely changes mid-session |
| Lists (chats, items) | 2-5 min | Balance freshness vs. performance |
| Messages/content | 2-5 min | Show cached, refetch in background |
| Real-time data | 30 sec - 1 min | More frequent updates needed |

**Never use `staleTime: 0`** - this defeats caching entirely.

### Avoid Aggressive Invalidation

```typescript
// ❌ BAD - Blanket invalidation on visibility
useEffect(() => {
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      queryClient.invalidateQueries({ queryKey: ['chats'] })
    }
  }
  document.addEventListener('visibilitychange', handleVisibility)
}, [])
```

Let `staleTime` manage freshness. Only invalidate after mutations.

## Cache Updates After Mutations

### Prefer setQueryData Over invalidateQueries

```typescript
// ✅ GOOD - Surgical cache update
const mutation = useMutation({
  mutationFn: api.deleteChat,
  onMutate: async (chatId) => {
    await queryClient.cancelQueries(['chats'])
    const previous = queryClient.getQueryData(['chats'])

    // Optimistic update
    queryClient.setQueryData(['chats'], (old) =>
      old.filter((c) => c.id !== chatId)
    )

    return { previous }
  },
  onError: (err, id, context) => {
    queryClient.setQueryData(['chats'], context.previous)
  },
  // No onSettled invalidation needed - cache is already updated
})
```

```typescript
// ❌ BAD - Defeats cache benefits
onSettled: () => {
  queryClient.invalidateQueries(['chats'])  // Unnecessary refetch
}
```

## Streaming/Real-time Updates

When receiving streamed data (WebSocket, SSE), update the cache directly:

```typescript
// ✅ GOOD - Update cache during streaming
const onStreamComplete = (newMessage) => {
  queryClient.setQueryData(['messages', chatId], (old) => ({
    ...old,
    pages: old.pages.map((page, i) =>
      i === 0 ? { ...page, messages: [...page.messages, newMessage] } : page
    ),
  }))
}
```

## Zustand: UI State Only

Zustand should hold state that:
- Doesn't come from an API
- Is purely client-side/visual
- Doesn't need to persist across page loads

```typescript
// ✅ GOOD - Zustand for UI state
const useUIStore = create((set) => ({
  sidebarOpen: false,
  selectedChatId: null,   // Which chat is selected (UI)
  theme: 'dark',
  isStreaming: false,     // Is AI currently responding (UI)
}))

// ❌ BAD - Zustand for server data
const useChatStore = create((set) => ({
  user: null,         // Should be in Query
  chats: [],          // Should be in Query
  messages: {},       // Should be in Query
}))
```

## Next.js Server Components

For Next.js apps, prefer Server Components for initial data:

```typescript
// ✅ GOOD - Fetch once in layout, share via context
export default async function AccountLayout({ children }) {
  const user = await ensureDbUser()  // Server-side fetch

  return (
    <UserProvider user={user}>
      {children}
    </UserProvider>
  )
}

// Client components use context (no additional fetch)
function AccountPage() {
  const { user } = useUser()  // From context
  return <Dashboard user={user} />
}
```

## Quick Checklist

- [ ] Server data is managed by TanStack Query (not Zustand)
- [ ] Zustand only holds UI/client state
- [ ] No syncing from Query → Zustand
- [ ] staleTime is at least 1-2 minutes (never 0)
- [ ] refetchOnWindowFocus is false (or explicitly controlled)
- [ ] Mutations use setQueryData for optimistic updates
- [ ] No blanket invalidation on visibility change
- [ ] Components read from Query hooks, not stores

## Anti-Patterns Summary

| Anti-Pattern | Fix |
|--------------|-----|
| `staleTime: 0` | Use 2-5 min minimum |
| Query → Zustand sync | Use Query data directly |
| `invalidateQueries` on visibility | Let staleTime manage it |
| `onSettled: invalidate` after mutation | Use setQueryData instead |
| Multiple fetches for same data | Use React Context or Query |

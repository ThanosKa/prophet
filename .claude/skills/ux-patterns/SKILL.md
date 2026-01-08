---
name: ux-patterns
description: User experience patterns for loading states, error handling, empty states, and user feedback. Use when implementing UI that needs to communicate system state to users.
---

# UX Patterns - User Experience Best Practices

## Overview

Creating great user experiences means communicating system state clearly. Users should never see blank screens, crash without context, or wonder if their action worked. This skill covers patterns for loading states, error recovery, empty states, and user feedback that create confidence and perceived performance.

## Loading States

### Skeleton Screens vs Spinners

```typescript
// ✅ GOOD - Skeleton screen (shows expected layout)
export function ChatListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}

// ❌ BAD - Spinner that hides everything
export function ChatListLoading() {
  return <Spinner /> // User doesn't know what's loading
}
```

**Why:** Skeleton screens show the expected layout, reducing cognitive load and creating perceived speed. Users see structure immediately rather than a blank screen with a spinner.

### Progressive Loading (Show Something Immediately)

```typescript
// ✅ GOOD - Show static content, stream dynamic content
export async function ChatPage({ chatId }: Props) {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  }) // Fetch immediately, show title

  return (
    <>
      <ChatHeader title={chat.title} />

      <Suspense fallback={<MessageListSkeleton />}>
        <MessageList chatId={chatId} />
      </Suspense>
    </>
  )
}

// ❌ BAD - Wait for everything
export async function ChatPage({ chatId }: Props) {
  const [chat, messages] = await Promise.all([
    db.query.chats.findFirst(where),
    db.query.messages.findMany(where),
  ]) // Wait for both before showing anything

  return <ChatView chat={chat} messages={messages} />
}
```

**Why:** Users see partial content immediately. Each component is responsible for its own loading state (header loads fast, messages follow).

### Optimistic Updates (Feel Instant)

```typescript
// ✅ GOOD - Update UI immediately, rollback on error
'use client'
export function ChatInput() {
  const [messages, setMessages] = useState([])
  const { mutate: sendMessage } = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({ content }),
      })
      return response.json()
    },
    onMutate: async (content) => {
      // Optimistic update
      const tempId = crypto.randomUUID()
      setMessages(prev => [...prev, {
        id: tempId,
        content,
        role: 'user',
        pending: true,
      }])
    },
    onError: (error, content, context) => {
      // Rollback on error
      setMessages(prev => prev.filter(m => m.id !== tempId))
      toast.error('Failed to send message')
    },
  })

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      sendMessage(input)
      setInput('')
    }}>
      {/* ... */}
    </form>
  )
}

// ❌ BAD - Wait for server response
setMessages(prev => [...prev, newMessage]) // Only after server confirms
```

**Why:** Actions feel instant to users even if server is slow. Message appears immediately, deletion/error handled gracefully.

## Error Handling

### Error Boundaries with Fallback UI

```typescript
// ✅ GOOD - Catch errors, show fallback
'use client'
export function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center p-6">
      <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-gray-600 mt-1">
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={() => reset()}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Try again
      </button>
    </div>
  )
}

// ❌ BAD - App crashes with no recovery
// Component throws, entire page goes blank
```

**Why:** Error boundaries prevent cascading failures. Users see context about what failed and can retry.

### Graceful Degradation (Preserve Context)

```typescript
// ✅ GOOD - Show what loaded, disable what failed
export function ChatDetail() {
  const { data: chat } = useQuery({
    queryKey: ['chats', chatId],
    queryFn: () => fetch(`/api/chats/${chatId}`).then(r => r.json()),
  })

  const { data: messages, isLoading, error } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => fetch(`/api/messages?chatId=${chatId}`).then(r => r.json()),
  })

  if (!chat) return <NotFound />

  return (
    <>
      <ChatHeader chat={chat} /> {/* Always show */}
      {error ? (
        <div className="p-4 bg-red-50 text-red-800">
          Failed to load messages.
          <button onClick={() => /* retry */}>Retry</button>
        </div>
      ) : isLoading ? (
        <MessageListSkeleton />
      ) : (
        <MessageList messages={messages} />
      )}
    </>
  )
}

// ❌ BAD - One failure blocks everything
if (isLoading || !chat || !messages) return <LoadingSpinner />
```

**Why:** Users see what loaded. They can still read the chat title/metadata while messages retry.

### Clear Error Messages

```typescript
// ✅ GOOD - Specific, actionable error messages
if (error.code === 'INSUFFICIENT_CREDITS') {
  return (
    <ErrorCard
      title="Not enough credits"
      message="You need 100+ credits. "
      action={<Link href="/pricing">Upgrade plan</Link>}
    />
  )
}

// ❌ BAD - Generic errors
if (error) {
  return <div>Error: {error.message}</div> // "Error: 402 Payment Required"?
}
```

**Why:** Specific messages tell users exactly what went wrong and how to fix it.

## Empty States

### First-Time User Experience

```typescript
// ✅ GOOD - Welcome state with call-to-action
export function ChatListEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <MessageCircle className="h-12 w-12 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold">No chats yet</h3>
      <p className="text-gray-600 mt-1">
        Start a conversation to begin chatting with our AI assistant
      </p>
      <Button asChild className="mt-6">
        <Link href="/chat/new">Start a new chat</Link>
      </Button>
    </div>
  )
}

// ❌ BAD - Just shows nothing
if (chats.length === 0) return null
```

**Why:** Users know what to do next. Empty state is an opportunity to guide.

## User Feedback

### Toast Notifications (Transient Feedback)

```typescript
// ✅ GOOD - Brief, contextual feedback
const { mutate: deleteChat } = useMutation({
  mutationFn: async () => {
    await fetch(`/api/chats/${chatId}`, { method: 'DELETE' })
  },
  onSuccess: () => {
    toast.success('Chat deleted') // 3 seconds, auto-dismiss
    router.push('/chats')
  },
  onError: () => {
    toast.error('Failed to delete chat') // 5 seconds, won't auto-dismiss if hovered
  },
})

// ❌ BAD - Persistent, unclear feedback
alert('success') // Blocks interaction until dismissed
```

**Why:** Toasts acknowledge actions without blocking workflow. User can continue working.

### Inline Validation (Immediate Feedback)

```typescript
// ✅ GOOD - Show errors as user types
'use client'
export function MessageForm() {
  const [content, setContent] = useState('')
  const [error, setError] = useState('')

  const handleChange = (value: string) => {
    setContent(value)

    if (value.length === 0) {
      setError('Message cannot be empty')
    } else if (value.length > 10000) {
      setError('Message too long (max 10,000 characters)')
    } else {
      setError('')
    }
  }

  return (
    <>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        className={error ? 'border-red-500' : ''}
      />
      {error && <span className="text-red-500 text-sm">{error}</span>}
      <Button disabled={!!error}>Send</Button>
    </>
  )
}

// ❌ BAD - Only validate on submit
<button onClick={() => {
  if (!content) return alert('Message cannot be empty')
  // submit...
}} />
```

**Why:** Users see errors immediately and can fix before attempting to submit.

### Loading Indicators on Buttons

```typescript
// ✅ GOOD - Show loading state during submission
<Button
  disabled={isPending}
  onClick={() => mutate()}
>
  {isPending ? (
    <>
      <Spinner className="mr-2 h-4 w-4 animate-spin" />
      Sending...
    </>
  ) : (
    'Send Message'
  )}
</Button>

// ❌ BAD - No feedback during action
<Button onClick={() => mutate()}>Send Message</Button> // Did it work?
```

**Why:** Users see that their action is being processed.

## Perceived Performance

### Content Prioritization (Show Priority Content First)

```typescript
// ✅ GOOD - Load critical content, then enhance
export async function Page() {
  // Load fast
  const chat = await db.query.chats.findFirst(...)

  return (
    <>
      <ChatHeader title={chat.title} /> {/* Instant */}
      <ChatActions chatId={chat.id} />

      <Suspense fallback={<MessageListSkeleton />}>
        <MessageList chatId={chat.id} /> {/* Load second */}
      </Suspense>

      <Suspense fallback={null}>
        <RelatedChats /> {/* Load third (non-critical) */}
      </Suspense>
    </>
  )
}

// ❌ BAD - Wait for everything
const [chat, messages, related] = await Promise.all([...])
```

**Why:** Users see something fast. Less critical content loads after.

### Animations During Loading (Perceived Responsiveness)

```typescript
// ✅ GOOD - Subtle animations show system is working
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  <MessageSkeleton />
</motion.div>

// ✅ GOOD - Skeleton shimmer animation
<div className="animate-pulse bg-gradient-to-r from-gray-100 to-gray-200" />

// ❌ BAD - Static skeleton (feels stuck)
<div className="bg-gray-200" />
```

**Why:** Animation signals "system is working" vs "something is broken".

## Anti-Patterns to Avoid

- ❌ Blocking spinners that hide all content
- ❌ Generic error messages without context
- ❌ No empty states (users don't know what to do)
- ❌ No loading indicators (users wonder if action worked)
- ❌ Waiting for all data before showing anything
- ❌ No error recovery mechanisms (retry buttons)
- ❌ Toast messages that dismiss too fast
- ❌ No optimistic updates (everything feels slow)

## Quick Checklist

- [ ] Loading states show expected layout (skeleton screens)
- [ ] Progressive loading - show something immediately
- [ ] Optimistic updates for instant feedback
- [ ] Error boundaries catch and display errors gracefully
- [ ] One component's error doesn't break the entire page
- [ ] Empty states have clear call-to-action
- [ ] Actions show loading state (spinner/disabled button)
- [ ] Inline validation as users type
- [ ] Toast notifications for transient feedback
- [ ] Critical content loads first, nice-to-have content later

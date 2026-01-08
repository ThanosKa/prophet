---
name: component-design
description: Component composition and design patterns for building scalable, maintainable React UIs. Use when creating new components, designing component APIs, or refactoring existing ones.
---

# Component Design Patterns

## Philosophy

Great component design is about creating components that are **composable, predictable, and delightful to use**. Components should communicate their intent clearly through naming and structure, offer maximum flexibility through composition, and prevent invalid states through good design.

The three pillars of good component design:
1. **Composition** - Build complex UIs from simple pieces
2. **Type Safety** - Make invalid states impossible
3. **Clear Intent** - Component name and props tell the story

## Naming Conventions
```typescript
// ✅ GOOD - PascalCase for components
export function ChatMessage({ content }: Props) {}
export function UserAvatar({ userId }: Props) {}

// ❌ BAD - camelCase or other
export function chatMessage() {}
export function user_avatar() {}

// ✅ GOOD - Named exports (easier debugging)
export function Button() {}

// ❌ BAD - Default exports without names
export default () => {}
```

## Component Structure
```typescript
// ✅ GOOD - Clear, single responsibility
interface MessageProps {
  content: string
  author: string
  timestamp: Date
}

export function Message({ content, author, timestamp }: MessageProps) {
  return (
    <div className="message">
      <MessageHeader author={author} timestamp={timestamp} />
      <MessageContent content={content} />
    </div>
  )
}

// ❌ BAD - Too many responsibilities
function Message({ content, author, timestamp, onEdit, onDelete, isEditing, showAvatar, ... }: ManyProps) {
  // 200 lines of logic
}
```

## Composition Over Props
**Principle**: Prefer composition over boolean props

```typescript
// ✅ GOOD - Composition pattern
<Card>
  <CardHeader>
    <CardTitle>Chat History</CardTitle>
  </CardHeader>
  <CardContent>
    <ChatList chats={chats} />
  </CardContent>
</Card>

// ❌ BAD - Boolean soup
<Card title="Chat History" showHeader showFooter bordered shadowed />
```

## Variant Pattern
**Principle**: Use variants instead of multiple booleans

```typescript
// ✅ GOOD - Single variant prop (using cva from class-variance-authority)
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-blue-500 text-white hover:bg-blue-600',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
        ghost: 'hover:bg-gray-100',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button({
  variant,
  size,
  className,
  ...props
}: ButtonProps) {
  return (
    <button className={buttonVariants({ variant, size, className })} {...props} />
  )
}

// Usage: Type-safe, autocomplete works
<Button variant="destructive" size="lg">Delete</Button>

// ❌ BAD - Multiple booleans (can have invalid combinations)
type ButtonProps = {
  isPrimary?: boolean
  isSecondary?: boolean
  isDestructive?: boolean
  isGhost?: boolean
  small?: boolean
  large?: boolean
}
// <Button isPrimary isSecondary /> - Invalid state allowed!
```

**Why:** Variants ensure only valid combinations exist. Autocomplete helps users discover all options. CSS stays organized by feature, not by props.

## Composition & Slots

**Principle**: Build flexibility through composition, not prop configuration

```typescript
// ✅ GOOD - Flexible composition with slots
<Card>
  <CardHeader>
    <CardTitle>Chat History</CardTitle>
    <CardDescription>Your recent conversations</CardDescription>
  </CardHeader>
  <CardContent>
    <ChatList chats={chats} />
  </CardContent>
  <CardFooter>
    <Button>View All</Button>
  </CardFooter>
</Card>

// ✅ GOOD - Compound components with Context
'use client'
import { createContext } from 'react'

const DialogContext = createContext<{ isOpen: boolean; close: () => void } | null>(null)

export function Dialog({ children, open, onOpenChange }: Props) {
  return (
    <DialogContext.Provider value={{ isOpen: open, close: () => onOpenChange(false) }}>
      {children}
    </DialogContext.Provider>
  )
}

export function DialogTrigger({ children, ...props }: ButtonHTMLAttributes) {
  const context = useContext(DialogContext)
  return <Button onClick={context?.close} {...props}>{children}</Button>
}

export function DialogContent({ children }: Props) {
  const context = useContext(DialogContext)
  return context?.isOpen ? <div className="modal">{children}</div> : null
}

// Usage feels natural and predictable
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    {/* Content */}
  </DialogContent>
</Dialog>

// ❌ BAD - Configuration hell (not composable)
<Card
  title="Chat"
  subtitle="Conversations"
  header
  footer
  footerAction="View All"
  onFooterAction={handleViewAll}
/>
```

**Why:** Composition gives maximum flexibility. Users can customize any part. Code reads like the UI structure. No prop explosion.

## Compound Component Pattern

```typescript
// ✅ GOOD - Table with compound pattern
export const Table = Object.assign(
  function TableRoot({ children }: Props) {
    return <table>{children}</table>
  },
  {
    Header: function TableHeader({ children }: Props) {
      return <thead>{children}</thead>
    },
    Body: function TableBody({ children }: Props) {
      return <tbody>{children}</tbody>
    },
    Row: function TableRow({ children, ...props }: Props) {
      return <tr {...props}>{children}</tr>
    },
    Cell: function TableCell({ children, ...props }: Props) {
      return <td {...props}>{children}</td>
    },
  }
)

// Usage: Clear structure, fully customizable
<Table>
  <Table.Header>
    <Table.Row>
      <Table.Cell>Name</Table.Cell>
      <Table.Cell>Email</Table.Cell>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {users.map(user => (
      <Table.Row key={user.id}>
        <Table.Cell>{user.name}</Table.Cell>
        <Table.Cell>{user.email}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table>
```

**Why:** Each sub-component has one job. Provides structure without enforcing rigid layout.

## State Management
**Principles from React docs**:
1. Group related state
2. Avoid contradictions in state
3. Avoid redundant state (derive from props/state)
4. Avoid duplication
5. Avoid deeply nested state (prefer flat)

```typescript
// ✅ GOOD - Grouped related state
const [formData, setFormData] = useState({
  email: '',
  password: '',
})

// ❌ BAD - Scattered state
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')

// ✅ GOOD - Derived state
function ChatMessages({ messages }: Props) {
  const isEmpty = messages.length === 0 // Derive, don't store
  return isEmpty ? <EmptyState /> : <MessageList messages={messages} />
}

// ❌ BAD - Redundant state
const [messages, setMessages] = useState([])
const [isEmpty, setIsEmpty] = useState(true) // Redundant!
```

## Server vs Client Components (Next.js)
**Rule**: Server Components by default, Client Components only when needed

```typescript
// ✅ GOOD - Server Component (no directive needed)
// app/components/chat-list.tsx
import { db } from '@/lib/db'

export async function ChatList({ userId }: Props) {
  const chats = await db.query.chats.findMany({ where: eq(chats.userId, userId) })
  return <div>{chats.map(chat => <ChatCard key={chat.id} chat={chat} />)}</div>
}

// ✅ GOOD - Client Component when needed (interactivity)
// app/components/chat-input.tsx
'use client'

import { useState } from 'react'

export function ChatInput({ onSend }: Props) {
  const [message, setMessage] = useState('')
  return <input value={message} onChange={e => setMessage(e.target.value)} />
}

// ❌ BAD - Unnecessary 'use client'
'use client' // Don't need this for static content!

export function ChatCard({ chat }: Props) {
  return <div>{chat.title}</div>
}
```

## Interleaving Server/Client
**Pattern**: Pass Server Components as children to Client Components

```typescript
// ✅ GOOD - Server Component as children
// app/layout.tsx (Server)
import { Sidebar } from './sidebar' // Client Component

export default function Layout({ children }: Props) {
  return (
    <Sidebar>
      {children} {/* Server Component content */}
    </Sidebar>
  )
}

// sidebar.tsx (Client)
'use client'
export function Sidebar({ children }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  return <aside>{children}</aside>
}

// ❌ BAD - Importing Server Component in Client
'use client'
import { ChatList } from './chat-list' // Server Component - won't work!
```

## File Organization
```
components/
├── ui/              # Reusable UI components (shadcn)
│   ├── button.tsx
│   ├── card.tsx
│   └── input.tsx
├── chat/            # Feature-specific components
│   ├── chat-list.tsx
│   ├── chat-message.tsx
│   └── chat-input.tsx
└── layout/          # Layout components
    ├── sidebar.tsx
    └── header.tsx
```

## Props Type Patterns
```typescript
// ✅ GOOD - Discriminated unions for exclusive states
type MessageProps =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'success'; data: Message }

// ❌ BAD - Allows invalid states
type MessageProps = {
  loading?: boolean
  error?: string
  data?: Message
} // Can have loading=true AND data at same time!

// ✅ GOOD - Config object for related props
interface CardConfig {
  padding: 'sm' | 'md' | 'lg'
  shadow: boolean
  border: boolean
}

type CardProps = {
  config: CardConfig
  children: React.ReactNode
}
```

## Anti-Patterns to Avoid
- ❌ Too many props (>5 usually means refactor)
- ❌ Prop drilling (use composition or context)
- ❌ Giant components (>200 lines, split it)
- ❌ Mixing server and client logic
- ❌ Using 'use client' at file top when only one component needs it
- ❌ Nested ternaries in JSX (extract to variables)

## Quick Checklist
Before committing a component:
- [ ] Named export with PascalCase
- [ ] Single responsibility
- [ ] Props interface defined
- [ ] Server or Client Component (correct choice)
- [ ] No prop drilling (used composition)
- [ ] State properly structured (grouped, not redundant)
- [ ] File in correct directory

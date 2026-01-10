import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Load .env.local before anything else (ESM-compatible)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = resolve(__dirname, '../.env.local')
config({ path: envPath })

// Debug: Check if env loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local')
  console.error(`Tried to load from: ${envPath}`)
  console.error('Make sure .env.local exists in apps/marketing/')
  process.exit(1)
}

// Environment check - only allow in development
if (process.env.NODE_ENV === 'production') {
  console.error('❌ Cannot run seed script in production!')
  process.exit(1)
}

// Use dynamic imports to ensure env is loaded first
const { db } = await import('../lib/db/index.js')
const { chats, messages, users } = await import('../lib/db/schema.js')
const { eq, asc } = await import('drizzle-orm')

// Auto-detect user from database
async function getUserId(): Promise<{ id: string; email: string }> {
  // Allow override via env var (optional)
  if (process.env.SEED_USER_ID && !process.env.SEED_USER_ID.includes('xxx')) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, process.env.SEED_USER_ID),
    })
    if (user) {
      return { id: user.id, email: user.email }
    }
    console.warn(`⚠️ SEED_USER_ID ${process.env.SEED_USER_ID} not found, auto-detecting...`)
  }

  // Auto-detect: get first user from database
  const firstUser = await db.query.users.findFirst({
    orderBy: [asc(users.createdAt)],
  })

  if (!firstUser) {
    console.error('❌ No users found in database.')
    console.error('   Sign in to the app first to create your user account.')
    console.error('')
    console.error('   Steps:')
    console.error('   1. Run: pnpm dev:web')
    console.error('   2. Go to http://localhost:3000')
    console.error('   3. Sign in with Clerk')
    console.error('   4. Run this script again')
    process.exit(1)
  }

  return { id: firstUser.id, email: firstUser.email }
}

// Template Q&As to build long conversations
const qaTemplates = [
  { q: 'How do I get started with React?', a: 'Great question! To get started with React, you\'ll need Node.js installed. Then run `npx create-react-app my-app` to create a new React project. React is a JavaScript library for building user interfaces, particularly single-page applications.' },
  { q: 'What are hooks?', a: 'Hooks are functions that let you use React features like state and lifecycle methods in functional components. The most common hooks are `useState` for managing state and `useEffect` for side effects like data fetching or subscriptions.' },
  { q: 'Should I use `any` in TypeScript?', a: 'It\'s best to avoid `any` in TypeScript as it defeats the purpose of type safety. Instead, use `unknown` for truly unknown types, or define proper interfaces/types. If you must use it temporarily, add a `// @ts-expect-error` comment explaining why.' },
  { q: 'What\'s the difference between REST and GraphQL?', a: 'REST uses multiple endpoints with standard HTTP methods (GET, POST, PUT, DELETE), while GraphQL uses a single endpoint where clients specify exactly what data they need. REST can lead to over-fetching or under-fetching, while GraphQL lets clients request precisely the data they need in a single query.' },
  { q: 'When should I use GraphQL?', a: 'GraphQL is great when you have complex data requirements, multiple client types (web, mobile, etc.) that need different data, or when you want to avoid multiple round trips. However, REST is simpler for basic CRUD operations and has better caching with HTTP.' },
  { q: 'How do I optimize PostgreSQL queries?', a: 'Key strategies: 1) Add indexes on frequently queried columns, 2) Use EXPLAIN ANALYZE to understand query plans, 3) Avoid N+1 queries with JOINs or batch loading, 4) Use connection pooling, 5) Consider materialized views for complex aggregations.' },
  { q: 'What\'s the testing pyramid?', a: 'The testing pyramid suggests having: lots of unit tests (fast, isolated), fewer integration tests (test modules working together), and even fewer E2E tests (slow, brittle). The idea is that unit tests catch most bugs quickly, while E2E tests validate critical user flows.' },
  { q: 'How do I implement authentication?', a: 'There are several approaches: 1) Session-based auth with cookies, 2) Token-based auth with JWT, 3) OAuth 2.0 for third-party login, 4) Passwordless with magic links or OTP. For SaaS apps, consider using Clerk or Auth0 to handle the complexity.' },
  { q: 'What are React Server Components?', a: 'React Server Components (RSC) let you write components that render on the server and stream to the client. They can directly access databases and APIs without exposing credentials. Next.js 13+ uses RSC by default in the App Router.' },
  { q: 'How do I handle errors in async/await?', a: 'Wrap async calls in try/catch blocks. For React, use error boundaries to catch rendering errors. For API routes, return proper HTTP status codes. Consider using libraries like `neverthrow` for functional error handling.' },
  { q: 'What\'s the difference between SSR and SSG?', a: 'SSR (Server-Side Rendering) generates HTML on each request. SSG (Static Site Generation) generates HTML at build time. Use SSR for dynamic content, SSG for static pages. Next.js supports both plus ISR (Incremental Static Regeneration).' },
  { q: 'How do I optimize bundle size?', a: 'Use code splitting with dynamic imports, tree shaking to remove unused code, analyze bundle with webpack-bundle-analyzer, lazy load images and components, and use production builds which minify code automatically.' },
  { q: 'What are Web Vitals?', a: 'Core Web Vitals are Google\'s metrics for user experience: LCP (Largest Contentful Paint) measures loading, FID (First Input Delay) measures interactivity, CLS (Cumulative Layout Shift) measures visual stability. Aim for green scores in all three.' },
  { q: 'How do I implement caching?', a: 'Client-side: use React Query or SWR for data caching. Server-side: use Redis for session/data caching. HTTP: use Cache-Control headers. Database: use query result caching. CDN: cache static assets at the edge.' },
  { q: 'What\'s the difference between useMemo and useCallback?', a: '`useMemo` memoizes a computed value, `useCallback` memoizes a function. Use `useMemo` for expensive calculations, `useCallback` to prevent child re-renders when passing callbacks as props. Both take a dependency array.' },
]

// Generate a long conversation by repeating Q&As
function generateLongConversation(title: string, messageCount: number) {
  const msgs: Array<{ role: 'user' | 'assistant'; content: string }> = []
  let qaIndex = 0

  for (let i = 0; i < messageCount / 2; i++) {
    const qa = qaTemplates[qaIndex % qaTemplates.length]
    msgs.push({ role: 'user', content: qa.q })
    msgs.push({ role: 'assistant', content: qa.a })
    qaIndex++
  }

  return { title, messages: msgs }
}

const mockConversations = [
  generateLongConversation('Building a React App', 60),
  generateLongConversation('TypeScript Best Practices', 80),
  generateLongConversation('API Design Patterns', 100),
  generateLongConversation('Database Performance', 50),
  generateLongConversation('Testing Strategies', 70),
]

async function seed() {
  const { id: seedUserId, email } = await getUserId()

  console.log('🌱 Starting seed...')
  console.log(`📍 User: ${email} (${seedUserId})`)
  console.log('')

  // Delete existing seed data for this user
  console.log('🧹 Cleaning up existing data...')
  await db.delete(chats).where(eq(chats.userId, seedUserId))

  let totalChats = 0
  let totalMessages = 0

  // Create conversations
  for (const conv of mockConversations) {
    const [chat] = await db
      .insert(chats)
      .values({
        userId: seedUserId,
        title: conv.title,
        updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      })
      .returning()

    totalChats++

    // Add messages for this chat
    for (const msg of conv.messages) {
      await db.insert(messages).values({
        chatId: chat.id,
        role: msg.role,
        content: msg.content,
        model: 'claude-sonnet-4-20250514',
        inputTokens: msg.role === 'user' ? Math.floor(msg.content.length / 4) : 0,
        outputTokens: msg.role === 'assistant' ? Math.floor(msg.content.length / 4) : 0,
        costCents: msg.role === 'assistant' ? Math.floor(msg.content.length / 40) : 0,
      })
      totalMessages++
    }

    console.log(`✅ Created: ${chat.title} (${conv.messages.length} messages)`)
  }

  // Create additional chats to test pagination (empty chats)
  const additionalTitles = [
    'Docker Containers',
    'CI/CD Pipeline Setup',
    'Authentication Best Practices',
    'Microservices Architecture',
    'WebSocket Implementation',
    'Redis Caching Strategy',
    'Rate Limiting Patterns',
    'OAuth 2.0 Flow',
    'Git Workflow',
    'Code Review Tips',
    'Debugging Techniques',
    'Performance Optimization',
    'Security Headers',
    'CORS Configuration',
    'Environment Variables',
    'Logging Best Practices',
    'Error Handling Patterns',
    'State Management',
    'Component Architecture',
    'API Versioning',
  ]

  for (const title of additionalTitles) {
    await db.insert(chats).values({
      userId: seedUserId,
      title,
      updatedAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
    })
    totalChats++
  }

  console.log('')
  console.log('✨ Seed complete!')
  console.log(`📊 Created ${totalChats} chats and ${totalMessages} messages`)
  console.log('')
  console.log('💡 To remove seed data: pnpm db:seed:reset')
}

async function reset() {
  const { id: seedUserId, email } = await getUserId()

  console.log('🧹 Resetting seed data...')
  console.log(`📍 User: ${email} (${seedUserId})`)
  console.log('')

  const result = await db.delete(chats).where(eq(chats.userId, seedUserId))

  console.log('✅ Seed data removed')
  console.log('   (Messages were cascade deleted)')
}

// Run based on command
const command = process.argv[2]

if (command === 'reset') {
  reset()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Reset failed:', err)
      process.exit(1)
    })
} else {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seed failed:', err)
      process.exit(1)
    })
}

---
name: redis-caching
description: Production-ready Redis patterns for caching, sessions, counters, and data structures. Use when implementing caching strategies, session storage, global replication, or scaling read-heavy workloads.
---

# Redis: Caching & Session Management

**Documentation Sources**: Upstash Redis official documentation + 2025 industry best practices from production SaaS applications.

**Note**: Rate limiting patterns are covered in a separate skill (`.claude/skills/backend/rate-limiting/SKILL.md`). This skill focuses on caching, sessions, counters, and data structures for scaling SaaS applications from 1 to 100k+ users.

## When to Use Redis vs Database

Use Redis when you need **fast, temporary data access** with sub-millisecond latency. Use your database for **durable, complex data** that requires transactions and relationships.

| Use Case | Redis | Database |
|----------|-------|----------|
| API response caching | ✅ TTL-based, ultra-fast | ❌ Slow, expensive |
| User sessions (30min TTL) | ✅ Auto-expiration, fast | ❌ Manual cleanup needed |
| Page view counters | ✅ Atomic INCR, no locks | ❌ Race conditions |
| Leaderboards (top 100) | ✅ Sorted sets, O(log N) | ❌ Complex queries |
| User profiles | ❌ No durability guarantee | ✅ Persistent, transactional |
| Order history | ❌ Not a primary database | ✅ ACID compliance |
| Audit logs | ❌ Data loss risk | ✅ Long-term storage |

**Rule of Thumb**: Cache data you can afford to lose. Store critical data in your database.

---

## Core Caching Strategies

### Cache-Aside Pattern (Lazy Loading)

The most common caching strategy: check cache first, fetch from database on miss, then populate cache.

**Performance Impact**: 100x+ speed improvements (100ms database query → 1-2ms cache hit).

✅ **GOOD: Proper cache-aside with TTL and error handling**

```typescript
async function getUser(userId: string) {
  const cacheKey = `user:${userId}`

  // Try cache first
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }

  // Cache miss - fetch from database
  const user = await db.users.findUnique({ where: { id: userId } })
  if (!user) return null

  // Populate cache with 1-hour TTL
  await redis.setex(cacheKey, 3600, JSON.stringify(user))

  return user
}
```

❌ **BAD: No TTL (memory leak), no error handling**

```typescript
// PROBLEMS:
// 1. No TTL - data stays forever (memory leak)
// 2. No error handling - Redis failure crashes app
// 3. No JSON serialization - stores "[object Object]"
async function getUser(userId: string) {
  const cached = await redis.get(`user:${userId}`)
  if (cached) return cached

  const user = await db.users.findUnique({ where: { id: userId } })
  await redis.set(`user:${userId}`, user) // ❌ No TTL, no JSON.stringify
  return user
}
```

### Read-Through / Write-Through Caching

The cache layer automatically loads data on cache miss (read-through) or writes to both cache and database (write-through).

✅ **GOOD: Write-through with cache invalidation**

```typescript
async function updateUser(userId: string, data: UserUpdate) {
  const cacheKey = `user:${userId}`

  // Update database (source of truth)
  const updated = await db.users.update({
    where: { id: userId },
    data,
  })

  // Invalidate cache (next read will populate fresh data)
  await redis.del(cacheKey)

  // Alternative: Update cache immediately (write-through)
  // await redis.setex(cacheKey, 3600, JSON.stringify(updated))

  return updated
}
```

❌ **BAD: Stale cache data (no invalidation)**

```typescript
// PROBLEM: Database updated but cache still has old data
async function updateUser(userId: string, data: UserUpdate) {
  await db.users.update({
    where: { id: userId },
    data,
  })

  // ❌ Forgot to invalidate cache - stale data for up to 1 hour!

  return updated
}
```

### Edge Caching (Global Replication)

For global applications, use Upstash's Global Database to replicate cached data to multiple regions. Reads are served from the nearest region for minimal latency.

**Latency Metrics**:
- Same-region reads: <1ms
- Same-region writes: <5ms
- Cross-continent reads: <50ms (99th percentile)

✅ **GOOD: Read-optimized global caching**

```typescript
// Create Global Database in Upstash Console with:
// - Primary region: us-east-1 (where you write most often)
// - Read regions: eu-west-1, ap-southeast-1 (where users are)

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Reads are automatically routed to nearest region
const userData = await redis.get(`user:${userId}`)
```

❌ **BAD: Global database for write-heavy workloads**

```typescript
// PROBLEM: Every write is replicated to ALL regions
// Cost: Write commands are replicated and count as additional commands
// Use case: ❌ Real-time counters (100+ writes/sec) = expensive
// Use case: ✅ User profiles (mostly reads) = cost-effective

// ❌ Don't use global database for:
// - High-frequency writes (counters, real-time analytics)
// - Data that doesn't need global access
```

---

## Session Management

Store user sessions, auth tokens, and temporary application state with automatic expiration.

✅ **GOOD: Session with TTL and security**

```typescript
import { randomBytes } from 'crypto'

async function createSession(userId: string) {
  const sessionId = randomBytes(32).toString('hex')
  const session = {
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + 1800000, // 30 minutes
  }

  // Store session with 30-minute TTL
  await redis.setex(
    `session:${sessionId}`,
    1800, // 30 minutes in seconds
    JSON.stringify(session)
  )

  return sessionId
}

async function getSession(sessionId: string) {
  const data = await redis.get(`session:${sessionId}`)
  if (!data) return null

  const session = JSON.parse(data)

  // Optional: Sliding expiration (refresh on each access)
  await redis.expire(`session:${sessionId}`, 1800)

  return session
}

async function deleteSession(sessionId: string) {
  await redis.del(`session:${sessionId}`)
}
```

❌ **BAD: No expiration, sensitive data unencrypted**

```typescript
// PROBLEMS:
// 1. No TTL - sessions live forever
// 2. Sensitive data stored as plain text
// 3. No session refresh (fixed 30-minute lifetime)
async function createSession(userId: string, password: string) {
  const sessionId = randomBytes(32).toString('hex')

  // ❌ Storing password in Redis (security risk!)
  // ❌ No TTL - session never expires
  await redis.set(`session:${sessionId}`, JSON.stringify({
    userId,
    password, // ❌ Never store passwords in cache!
  }))

  return sessionId
}
```

**Session TTL Recommendations** (2025 industry standards):
- **User sessions**: 30 minutes (sliding expiration)
- **API tokens**: 1 hour (refresh tokens: 30 days)
- **OAuth tokens**: Match provider's expiration
- **Remember me**: 30 days (with refresh mechanism)

---

## Counters & Atomic Operations

Use Redis atomic operations to avoid race conditions when incrementing counters concurrently.

✅ **GOOD: Atomic counters with proper namespacing**

```typescript
// Atomic increment (thread-safe, no race conditions)
async function trackPageView(pageId: string) {
  const key = `pageviews:${pageId}:${getTodayDateString()}`

  // INCR is atomic - safe for concurrent requests
  const newCount = await redis.incr(key)

  // Set TTL on first increment (if not already set)
  if (newCount === 1) {
    await redis.expire(key, 86400 * 7) // 7 days
  }

  return newCount
}

// Decrement API quota
async function consumeAPICredit(userId: string) {
  const key = `quota:${userId}:${getCurrentMonth()}`
  const remaining = await redis.decr(key)

  if (remaining < 0) {
    await redis.incr(key) // Rollback
    throw new Error('Quota exceeded')
  }

  return remaining
}

// Get counter value
async function getPageViews(pageId: string) {
  const key = `pageviews:${pageId}:${getTodayDateString()}`
  const count = await redis.get(key)
  return count ? parseInt(count, 10) : 0
}

function getTodayDateString() {
  return new Date().toISOString().split('T')[0] // "2025-01-07"
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7) // "2025-01"
}
```

❌ **BAD: GET + SET pattern (race conditions)**

```typescript
// PROBLEM: Race condition between GET and SET
async function trackPageView(pageId: string) {
  // ❌ Two concurrent requests can read same value
  const current = await redis.get(`pageviews:${pageId}`)
  const count = current ? parseInt(current, 10) : 0

  // ❌ Both increment from same base - one increment lost!
  await redis.set(`pageviews:${pageId}`, count + 1)

  return count + 1
}

// Example race condition:
// Request A: GET → 100
// Request B: GET → 100 (reads before A writes)
// Request A: SET → 101
// Request B: SET → 101 (overwrites A's increment!)
// Expected: 102, Actual: 101 ❌
```

**Real-World Counter Use Cases**:
- Page views: `pageviews:{pageId}:{date}`
- API usage: `api:usage:{userId}:{month}`
- Rate limiting: `ratelimit:{userId}:{endpoint}`
- Feature flags: `feature:usage:{featureId}`

---

## Data Structures for Scaling

Redis provides specialized data structures optimized for specific use cases.

### Sorted Sets for Leaderboards

✅ **GOOD: Leaderboard with sorted sets**

```typescript
// Add user score (O(log N) time complexity)
async function updateLeaderboard(userId: string, score: number) {
  await redis.zadd('leaderboard:global', {
    score,
    member: userId,
  })
}

// Get top 10 users (O(log N + M) where M = 10)
async function getTopUsers(limit = 10) {
  const results = await redis.zrange('leaderboard:global', 0, limit - 1, {
    rev: true, // Descending order (highest scores first)
    withScores: true,
  })

  return results.map((item, index) => ({
    rank: index + 1,
    userId: item.member,
    score: item.score,
  }))
}

// Get user's rank
async function getUserRank(userId: string) {
  const rank = await redis.zrevrank('leaderboard:global', userId)
  return rank !== null ? rank + 1 : null // Convert 0-indexed to 1-indexed
}

// Get user's score
async function getUserScore(userId: string) {
  return await redis.zscore('leaderboard:global', userId)
}
```

❌ **BAD: Using database for leaderboards**

```typescript
// PROBLEM: Requires sorting entire table on every query
async function getTopUsers(limit = 10) {
  // ❌ Full table scan + sort = slow (>100ms for 10K+ users)
  return await db.users.findMany({
    orderBy: { score: 'desc' },
    take: limit,
  })
}

// ❌ Expensive query for user rank (counts all higher scores)
async function getUserRank(userId: string) {
  const user = await db.users.findUnique({ where: { id: userId } })
  if (!user) return null

  // ❌ Full table scan to count users with higher scores
  const count = await db.users.count({
    where: { score: { gt: user.score } }
  })

  return count + 1
}

// Redis sorted sets: O(log N) for reads/writes
// Database queries: O(N log N) for sorting, O(N) for counting
```

### Lists for Activity Feeds

✅ **GOOD: FIFO queue with lists**

```typescript
// Add activity to user's feed (newest first)
async function addActivity(userId: string, activity: Activity) {
  const key = `feed:${userId}`

  // LPUSH adds to the beginning (newest first)
  await redis.lpush(key, JSON.stringify(activity))

  // Keep only last 100 activities
  await redis.ltrim(key, 0, 99)

  // Set expiration
  await redis.expire(key, 86400 * 30) // 30 days
}

// Get user's recent activities
async function getActivityFeed(userId: string, limit = 20) {
  const key = `feed:${userId}`

  // LRANGE gets items from start to end
  const items = await redis.lrange(key, 0, limit - 1)

  return items.map(item => JSON.parse(item))
}
```

### Sets for Unique Collections

✅ **GOOD: User permissions with sets**

```typescript
// Add permission to user
async function grantPermission(userId: string, permission: string) {
  await redis.sadd(`permissions:${userId}`, permission)
}

// Check if user has permission (O(1) lookup)
async function hasPermission(userId: string, permission: string) {
  const exists = await redis.sismember(`permissions:${userId}`, permission)
  return exists === 1
}

// Get all user permissions
async function getUserPermissions(userId: string) {
  return await redis.smembers(`permissions:${userId}`)
}

// Remove permission
async function revokePermission(userId: string, permission: string) {
  await redis.srem(`permissions:${userId}`, permission)
}
```

### Hashes for Objects

✅ **GOOD: User profile with hashes**

```typescript
// Store user profile as hash (more memory-efficient than JSON strings)
async function setUserProfile(userId: string, profile: UserProfile) {
  await redis.hset(`user:${userId}`, {
    name: profile.name,
    email: profile.email,
    avatar: profile.avatar,
    bio: profile.bio,
  })

  await redis.expire(`user:${userId}`, 3600) // 1 hour
}

// Get specific field
async function getUserEmail(userId: string) {
  return await redis.hget(`user:${userId}`, 'email')
}

// Get entire profile
async function getUserProfile(userId: string) {
  const data = await redis.hgetall(`user:${userId}`)
  return Object.keys(data).length > 0 ? data : null
}

// Update single field
async function updateUserBio(userId: string, bio: string) {
  await redis.hset(`user:${userId}`, { bio })
}
```

### Hash Field Expiration (HEXPIRE) - April 2025+

Redis now supports per-field expiration in hashes - useful for mixed data with different TTLs.

✅ **GOOD: Hash fields with individual expiration**

```typescript
// Store user profile with per-field expiration
async function setUserWithMixedTTL(userId: string, profile: UserProfile) {
  // Set permanent fields (name, email)
  await redis.hset(`user:${userId}`, {
    name: profile.name,
    email: profile.email,
  })

  // Set temporary fields (verification token, OTP)
  await redis.hset(`user:${userId}`, {
    verificationToken: profile.token,
    otp: profile.code,
  })

  // Expire only the temporary fields (15 minutes)
  await redis.hexpire(`user:${userId}`, 900, ['verificationToken', 'otp'])
}

// Check if field still exists (use HTTL to get TTL)
async function isTokenValid(userId: string) {
  const ttl = await redis.httl(`user:${userId}`, 'verificationToken')
  return ttl > 0 // Field still valid
}

// Get TTL for field
async function getFieldTTL(userId: string, field: string) {
  const ttl = await redis.httl(`user:${userId}`, field)
  // ttl > 0: alive with that many seconds left
  // ttl === -1: field exists but no expiration
  // ttl === -2: field doesn't exist
  return ttl
}
```

**New Hash Expiration Commands** (April 2025+):
- `HEXPIRE key seconds fields...` - Expire fields in seconds
- `HPEXPIRE key milliseconds fields...` - Expire fields in milliseconds
- `HTTL key field` - Get remaining TTL in seconds
- `HPTTL key field` - Get remaining TTL in milliseconds

**Data Structure Selection Guide**:
- **Strings**: Simple key-value (sessions, cached API responses)
- **Sorted Sets**: Leaderboards, time-series data, priority queues
- **Lists**: Activity feeds, task queues, chat messages
- **Sets**: Tags, permissions, unique visitors
- **Hashes**: User profiles, product catalogs, configuration

---

## Global Database Architecture

Upstash Global Database replicates data across multiple regions for low-latency global access.

### When to Use Global Database

✅ **Use for read-heavy workloads** (90%+ reads):
- User profiles (read: 1000x/sec, write: 10x/sec)
- Product catalogs (read: 10000x/sec, write: 1x/hour)
- Configuration data (read: 1000x/sec, write: 1x/day)
- Static content caching

❌ **Don't use for write-heavy workloads**:
- Real-time counters (write: 100x/sec)
- Live analytics (write: 1000x/sec)
- Session storage with frequent updates

### Consistency Model

**Eventual Consistency**: Writes return immediately after primary replica processes the operation. Replication to read replicas happens asynchronously (typically <100ms).

✅ **GOOD: Appropriate use of eventual consistency**

```typescript
// User profile updates (eventual consistency is acceptable)
async function updateUserProfile(userId: string, data: ProfileUpdate) {
  // Write to primary region
  await redis.hset(`user:${userId}`, data)

  // ✅ OK: If user immediately reads from different region,
  // they might see old data for <100ms. This is acceptable
  // for profile updates (avatar, bio, etc.)
}
```

❌ **BAD: Expecting strong consistency**

```typescript
// Payment processing (requires strong consistency!)
async function processPayment(userId: string, amount: number) {
  // ❌ BAD: Using Redis Global Database for payment balance
  // Eventual consistency can cause race conditions:
  // - User charges $10 in us-east-1
  // - Immediately tries to charge $10 in eu-west-1
  // - EU region hasn't received update yet - allows duplicate charge!

  // ✅ Use database with ACID transactions for financial data
  await db.$transaction(async (tx) => {
    const user = await tx.users.findUnique({ where: { id: userId } })
    if (user.balance < amount) throw new Error('Insufficient funds')
    await tx.users.update({
      where: { id: userId },
      data: { balance: user.balance - amount }
    })
  })
}
```

**Consistency Requirements**:
- **Strong consistency needed**: Use database (payments, inventory, user credits)
- **Eventual consistency OK**: Use Redis Global DB (profiles, configs, static content)

---

## TTL Management & Memory Optimization

Always set expiration on temporary data to prevent memory leaks.

✅ **GOOD: Proper TTL for all temporary data**

```typescript
// EX: TTL in seconds
await redis.setex('cache:posts', 600, JSON.stringify(posts)) // 10 minutes

// PX: TTL in milliseconds
await redis.set('session:abc123', data, { px: 1800000 }) // 30 minutes

// EXAT: Expire at Unix timestamp (seconds)
const midnight = Math.floor(Date.now() / 1000) + 86400
await redis.set('daily:stats', data, { exat: midnight })

// PXAT: Expire at Unix timestamp (milliseconds)
const expiryTime = Date.now() + 3600000
await redis.set('temp:data', value, { pxat: expiryTime })

// Set TTL on existing key
await redis.expire('existing:key', 3600)
```

❌ **BAD: No expiration (memory leak)**

```typescript
// ❌ PROBLEM: Data stays in memory forever
await redis.set('cache:posts', JSON.stringify(posts)) // No TTL!

// Over time, Redis fills with stale data:
// - Old session tokens (users logged out weeks ago)
// - Outdated cached API responses
// - Temporary data that's no longer needed
// Result: Out of memory, slow queries, high costs
```

**TTL Recommendations** (2025 industry standards):

| Data Type | Recommended TTL | Reason |
|-----------|----------------|--------|
| User sessions | 30 minutes | Balance security + UX |
| API responses | 5-10 minutes | Freshness vs performance |
| Database queries | 1 hour | Reduce DB load |
| Static content | 24 hours | Infrequent changes |
| Temporary tokens | Match use case | OTP: 5min, reset: 1hr |
| Leaderboards | 1 hour | Balance freshness + cost |

---

## Cache Invalidation Strategies

Cache invalidation is one of the hardest problems in computer science. Choose the right strategy for your use case.

### Time-Based Invalidation (TTL)

✅ **GOOD: TTL for data with known freshness requirements**

```typescript
// Blog posts - update infrequently, 10-minute TTL is acceptable
async function getCachedPosts() {
  const cached = await redis.get('cache:posts')
  if (cached) return JSON.parse(cached)

  const posts = await db.posts.findMany()
  await redis.setex('cache:posts', 600, JSON.stringify(posts)) // 10 min TTL

  return posts
}
```

### Event-Based Invalidation (Manual)

✅ **GOOD: Invalidate cache on data changes**

```typescript
// Invalidate cache when post is created/updated
async function createPost(data: PostCreate) {
  const post = await db.posts.create({ data })

  // Invalidate cached posts list
  await redis.del('cache:posts')

  return post
}

async function updatePost(postId: string, data: PostUpdate) {
  const post = await db.posts.update({ where: { id: postId }, data })

  // Invalidate both list cache and individual post cache
  await redis.del('cache:posts', `cache:post:${postId}`)

  return post
}
```

### Tag-Based Invalidation

✅ **GOOD: Invalidate related caches with tags**

```typescript
// Track cache keys by tag
async function cacheWithTag(key: string, value: string, ttl: number, tag: string) {
  await redis.setex(key, ttl, value)
  await redis.sadd(`tag:${tag}`, key) // Add key to tag set
  await redis.expire(`tag:${tag}`, ttl + 60) // Tag expires after cache
}

// Invalidate all caches with tag
async function invalidateTag(tag: string) {
  const keys = await redis.smembers(`tag:${tag}`)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
  await redis.del(`tag:${tag}`)
}

// Usage
await cacheWithTag('cache:user:123', userData, 3600, 'user:123')
await cacheWithTag('cache:posts:user:123', userPosts, 3600, 'user:123')

// Invalidate all user-related caches
await invalidateTag('user:123') // Clears both user data and posts
```

❌ **BAD: Stale data with no invalidation strategy**

```typescript
// PROBLEM: Data changes but cache never updates
async function updatePost(postId: string, data: PostUpdate) {
  await db.posts.update({ where: { id: postId }, data })

  // ❌ Forgot to invalidate cache!
  // Users see old data for up to 10 minutes
}
```

---

## Error Handling & Graceful Degradation

Redis should enhance performance, not become a single point of failure. Always have a fallback.

✅ **GOOD: Graceful degradation if Redis unavailable**

```typescript
async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 3600
): Promise<T> {
  try {
    // Try cache first
    const cached = await redis.get(key)
    if (cached) return JSON.parse(cached)
  } catch (error) {
    // ✅ Redis error - log and continue to database
    console.error('Redis error:', error)
  }

  // Cache miss or error - fetch from source
  const data = await fetcher()

  try {
    // Try to populate cache (best effort)
    await redis.setex(key, ttl, JSON.stringify(data))
  } catch (error) {
    // ✅ Cache population failed - log but don't throw
    console.error('Failed to cache data:', error)
  }

  return data
}

// Usage
const user = await getCachedData(
  `user:${userId}`,
  () => db.users.findUnique({ where: { id: userId } }),
  3600
)
```

❌ **BAD: Hard dependency on Redis**

```typescript
// PROBLEM: App crashes if Redis is down
async function getUser(userId: string) {
  // ❌ Throws error if Redis unavailable - app down!
  const cached = await redis.get(`user:${userId}`)
  if (cached) return JSON.parse(cached)

  const user = await db.users.findUnique({ where: { id: userId } })

  // ❌ Throws error if Redis unavailable - app down!
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(user))

  return user
}
```

---

## Performance Optimization

### Connection Pooling

Upstash Redis uses HTTP-based access (no TCP connections), eliminating connection pooling concerns in serverless environments.

✅ **GOOD: Reuse Redis client instance**

```typescript
// Create once, reuse across requests
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export { redis }
```

### Pipelining for Batch Operations

✅ **GOOD: Pipeline multiple commands**

```typescript
async function cacheMultiplePosts(posts: Post[]) {
  const pipeline = redis.pipeline()

  posts.forEach(post => {
    pipeline.setex(
      `cache:post:${post.id}`,
      3600,
      JSON.stringify(post)
    )
  })

  // Execute all commands in single round-trip
  await pipeline.exec()
}
```

❌ **BAD: N+1 Redis calls**

```typescript
// PROBLEM: 100 posts = 100 round-trips to Redis
async function cacheMultiplePosts(posts: Post[]) {
  for (const post of posts) {
    await redis.setex(
      `cache:post:${post.id}`,
      3600,
      JSON.stringify(post)
    ) // ❌ Separate network call for each post
  }
}
```

### Compression for Large Values

✅ **GOOD: Compress large cached data**

```typescript
import { gzip, gunzip } from 'zlib'
import { promisify } from 'util'

const gzipAsync = promisify(gzip)
const gunzipAsync = promisify(gunzip)

async function cacheLargeData(key: string, data: object, ttl: number) {
  const json = JSON.stringify(data)
  const compressed = await gzipAsync(json)

  // Store as base64 string
  await redis.setex(key, ttl, compressed.toString('base64'))
}

async function getLargeData<T>(key: string): Promise<T | null> {
  const compressed = await redis.get(key)
  if (!compressed) return null

  const buffer = Buffer.from(compressed, 'base64')
  const decompressed = await gunzipAsync(buffer)

  return JSON.parse(decompressed.toString())
}
```

❌ **BAD: Storing large uncompressed data**

```typescript
// PROBLEM: Storing 5MB JSON without compression
// Cost: 5MB × $0.2/100K commands = expensive
// Alternative: Compress to 500KB = 90% savings
await redis.setex('large:data', 3600, JSON.stringify(largeObject))
```

---

## Cost Optimization

**Upstash Pricing** (2025): $0.2 per 100K commands. Global Database writes are replicated to all regions (counted as additional commands).

### When to Optimize

**Start optimizing** when:
- Exceeding ~10M requests/month ($20/month)
- Global Database with write-heavy workload
- Storing large values (>100KB)

✅ **GOOD: Cost-aware patterns**

```typescript
// Use pipeline to reduce command count
const pipeline = redis.pipeline()
// 100 commands → 1 request
await pipeline.exec()

// Use hashes for objects (more memory-efficient than JSON strings)
await redis.hset(`user:${userId}`, { name, email }) // More efficient than JSON.stringify

// Set appropriate TTLs (shorter = fewer stored keys = lower cost)
await redis.setex('temp:data', 300, value) // 5 min instead of 1 hour
```

❌ **BAD: Unnecessary global replication**

```typescript
// PROBLEM: Enabling global replication for data that's only accessed from one region
// Cost: 5x more expensive (1 primary + 4 read replicas)
// Solution: Use standard Redis database if data is regional
```

**Cost Optimization Checklist**:
- [ ] Use pipeline for batch operations
- [ ] Set appropriate TTLs (shorter when possible)
- [ ] Compress large values (>10KB)
- [ ] Use global replication only for global data
- [ ] Monitor command count in dashboard

---

## Monitoring & Observability

Upstash dashboard provides real-time metrics (refreshed every 10 seconds):
- Command latency (p50, p99)
- Memory usage
- Command count
- Error rate

### When to Alert

**Alert thresholds** (2025 best practices):
- Cache hit ratio <70% (inefficient caching)
- Latency >10ms same-region (performance degradation)
- Memory usage >80% (approaching limit)
- Error rate >1% (reliability issue)

✅ **GOOD: Track cache hit ratio**

```typescript
async function getCachedWithMetrics<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key)

  if (cached) {
    // Track cache hit
    await redis.incr('metrics:cache:hits')
    return JSON.parse(cached)
  }

  // Track cache miss
  await redis.incr('metrics:cache:misses')

  const data = await fetcher()
  await redis.setex(key, 3600, JSON.stringify(data))

  return data
}

// Calculate hit ratio
async function getCacheHitRatio() {
  const hits = await redis.get('metrics:cache:hits') || '0'
  const misses = await redis.get('metrics:cache:misses') || '0'

  const total = parseInt(hits) + parseInt(misses)
  if (total === 0) return 0

  return (parseInt(hits) / total) * 100
}
```

---

## Anti-Patterns & Common Mistakes

❌ **Storing large values without compression** (>1MB)
- Impact: High memory usage, slow operations, increased cost
- Solution: Compress data or split into smaller chunks

❌ **No TTL on temporary data**
- Impact: Memory leaks, out of memory errors
- Solution: Always set expiration on cache, sessions, temp data

❌ **Using Redis as primary database**
- Impact: Data loss risk (Redis is cache, not durable storage)
- Solution: Use database for critical data, Redis for caching

❌ **Caching everything indiscriminately**
- Impact: High costs, memory waste
- Solution: Cache only expensive operations (>50ms)

❌ **No cache invalidation strategy**
- Impact: Stale data shown to users
- Solution: Invalidate on updates or use appropriate TTL

❌ **Hard dependency on Redis**
- Impact: App down if Redis unavailable
- Solution: Graceful degradation with try/catch

❌ **GET + SET pattern for counters**
- Impact: Race conditions, lost increments
- Solution: Use atomic INCR/DECR

❌ **No monitoring of cache hit ratio**
- Impact: Can't identify inefficient caching
- Solution: Track hits/misses, alert on <70%

❌ **Global replication for write-heavy data**
- Impact: 5x higher costs
- Solution: Use standard database for regional data

❌ **Storing sensitive data unencrypted**
- Impact: Security risk if Redis compromised
- Solution: Encrypt sensitive data or don't cache it

---

## Quick Checklist

Before deploying Redis caching to production:

- [ ] All cached data has TTL (no permanent keys)
- [ ] Cache invalidation strategy defined
- [ ] Graceful degradation if Redis unavailable
- [ ] Using correct data structure for use case
- [ ] Cost-aware global replication settings (read-heavy only)
- [ ] Monitoring cache hit ratios (target >80%)
- [ ] Error handling for all Redis operations
- [ ] Security: No sensitive data unencrypted
- [ ] Using atomic operations for counters (INCR/DECR)
- [ ] Compression for large values (>10KB)
- [ ] Pipelining for batch operations
- [ ] Appropriate TTLs per data type

---

## Real-World Reference Numbers (2025)

**Performance Benchmarks**:
- Cache hit: 1-2ms (vs 50-100ms database query)
- Same-region Redis: <1ms (p99)
- Cross-region Redis: <50ms (p99)
- 100x+ speed improvement for cached data

**Cache Hit Ratio Targets**:
- Excellent: >80%
- Good: 70-80%
- Poor: <70% (investigate caching strategy)

**TTL Recommendations**:
- User sessions: 30 minutes (sliding expiration)
- API responses: 5-10 minutes
- Database queries: 1 hour
- Static content: 24 hours

**Global Replication Use Cases**:
- Use when: 90%+ reads, global user base
- Don't use when: Write-heavy, regional data only

**Cost Threshold**:
- Optimize after: ~10M commands/month ($20/month)
- Monitor: Upstash dashboard (command count, cost projections)

**Industry References**:
- [Upstash Redis Documentation](https://upstash.com/docs/redis)
- [Redis Caching Strategies 2025](https://www.digitalapplied.com/blog/redis-caching-strategies-nextjs-production)
- [Upstash Performance API](https://upstash.com/blog/redis-and-performance-api)

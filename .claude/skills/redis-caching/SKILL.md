---
name: redis-caching
description: Production-ready Redis patterns for caching, sessions, counters, and data structures. Use when implementing caching strategies, session storage, global replication, or scaling read-heavy workloads.
---

# Redis: Caching & Session Management

**Documentation Sources**: Upstash Redis official documentation + 2025 industry best practices from production SaaS applications.

**Note**: Rate limiting patterns are covered in the separate `rate-limiting` skill. This skill focuses on caching, sessions, counters, and data structures for scaling SaaS applications from 1 to 100k+ users.

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

## Quick Start Patterns

See `.claude/skills/redis-caching/SKILL.md` for:
- Cache-aside pattern (lazy loading)
- Session management with TTL
- Atomic counters and leaderboards
- Data structures (sorted sets, lists, hashes)
- Global replication strategies
- Cost optimization techniques

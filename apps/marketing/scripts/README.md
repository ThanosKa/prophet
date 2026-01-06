# Database Seed Script

Generate fake chat data for testing pagination and UI development.

## Quick Start

### Step 1: Get Your User ID

1. Sign in to your app in the browser
2. Open Drizzle Studio: `pnpm db:studio`
3. Navigate to the `users` table
4. Copy your Clerk user ID (starts with `user_2...`)

### Step 2: Set Environment Variable

Add to `apps/marketing/.env.local`:

```bash
# Development only - your Clerk user ID for seeding
SEED_USER_ID=user_2xxxxxxxxxxxxxxxxx
```

### Step 3: Run Seed Script

```bash
# From root directory
pnpm -F @prophet/marketing db:seed

# Or from apps/marketing directory
pnpm db:seed
```

This will create:
- ✅ **25 total chats** (5 with conversations, 20 empty with titles)
- ✅ **360 total messages** across 5 conversations (50-100 messages each)
- ✅ **Realistic Q&A format** from mock LLM conversations
- ✅ **Random timestamps** (spread over 30-60 days)
- ✅ **Token counts and costs** for messages

## What Gets Created

### Chats with Long Conversations (5)
1. Building a React App (60 messages)
2. TypeScript Best Practices (80 messages)
3. API Design Patterns (100 messages)
4. Database Performance (50 messages)
5. Testing Strategies (70 messages)

### Empty Chats with Titles (20)
- Docker Containers
- CI/CD Pipeline Setup
- Authentication Best Practices
- Microservices Architecture
- WebSocket Implementation
- ... and 15 more

## Reset Seed Data

To remove all seed data:

```bash
pnpm -F @prophet/marketing db:seed:reset
```

## Testing Pagination

### Chat Pagination
With 25 chats and a page size of 15:
- **Page 1**: Shows 15 most recent chats
- **Page 2**: Shows remaining 10 chats
- **Load More**: Scroll to bottom of chat list to load older chats

### Message Pagination
Each conversation has 50-100 messages with a page size of 50:
- **Initial load**: Shows 50 most recent messages
- **Load Older**: Scroll to top of chat to load older messages
- **Test scrolling**: API Design Patterns has 100 messages (2 pages)

## Customization

Edit `apps/marketing/scripts/seed.ts` to:
- Change the number of chats
- Add more conversation templates
- Modify message content
- Adjust timestamps

## Production Safety

❌ **Cannot run in production** - script checks `NODE_ENV` and exits if production

✅ **Only affects SEED_USER_ID** - other users' data is untouched

✅ **Idempotent** - running multiple times deletes old seed data first

## Example Output

```bash
$ pnpm db:seed

🌱 Starting seed...
📝 Seeding for user: user_2yABCDEFGHIJKLMNOP
🧹 Cleaning up existing seed data...
✅ Created chat: Building a React App
✅ Created chat: TypeScript Best Practices
✅ Created chat: API Design Patterns
✅ Created chat: Database Performance
✅ Created chat: Testing Strategies

✨ Seed complete!
📊 Created 25 chats and 360 messages

💡 To remove seed data, run: pnpm db:seed:reset
```

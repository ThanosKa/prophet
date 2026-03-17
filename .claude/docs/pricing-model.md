# Prophet Pricing Model - End-to-End Analysis

## Quick Summary

**You NEVER lose money.** Every API call has a 20% markup that guarantees profit.

---

## How It Works

### What is a "Credit"?
- **1 Credit = 1 Cent**
- Credits are just dollar amounts stored as cents in the database
- Field name is `creditsRemaining` but it's really your dollar balance × 100

### The Flow: User Request → Charged

1. **User sends a message** in the Chrome extension
2. **Pre-flight check**: Must have at least 10 credits ($0.10)
3. **API call to Anthropic**: Message is streamed back
4. **Track tokens**: Count input/output tokens during streaming
5. **Calculate cost**: Use Anthropic's pricing + apply 20% markup
6. **Deduct credits**: Atomic database transaction deducts the cost
7. **Log usage**: Record saved for billing transparency

---

## Pricing Calculation (Per Message)

### Step 1: Calculate Raw API Cost
```
Anthropic charges per million tokens:
- Haiku:  $1 input,  $5 output (per 1M tokens)
- Sonnet: $3 input, $15 output (per 1M tokens)
- Opus:   $5 input, $25 output (per 1M tokens)

Example (1000 input + 500 output tokens with Sonnet):
- Input cost:  (1000 / 1,000,000) × $3  = $0.003
- Output cost: (500  / 1,000,000) × $15 = $0.0075
- Total raw cost: $0.0105
```

### Step 2: Apply 20% Markup
```
Markup cost = Raw cost × 1.20
$0.0105 × 1.20 = $0.0126
```

### Step 3: Convert to Credits (Cents)
```
Credits = Math.ceil(markup cost × 100)
Math.ceil($0.0126 × 100) = 2 credits
```

**User is charged 2 credits ($0.02)**

---

## Your Profit Per Message

Using the example above:
- **Charged to user**: 2 credits = $0.02
- **Your cost to Anthropic**: $0.0105
- **Your profit**: $0.02 - $0.0105 = **$0.0095** (0.95 cents)

**Profit margin**: ~47% on this request

---

## Subscription Tiers

| Tier | Monthly Price | Credits Given | Bonus | Actual Cost to You |
|------|--------------|---------------|-------|-------------------|
| Free | $0 | $0.20 | 0% | ~$0.17 |
| Pro | $9.99 | $11 | 10% | ~$9.17 |
| Premium | $29.99 | $35 | 17% | ~$29.17 |
| Ultra | $59.99 | $70 | 17% | ~$58.33 |

### How You Make Money

**Platform fee** = Subscription price - (Credits ÷ 1.20)

Example for **Pro tier**:
- User pays: $9.99
- Credits given: $11 worth (with 10% bonus)
- Actual API pool after markup: $11 ÷ 1.20 = $9.17
- **You lose $0.82 on the subscription**

**BUT** - You profit 20% on EVERY API call they make using those credits.

If they use all $11:
- Your cost: $9.17
- Profit from markup: $11 - $9.17 = **$1.83**
- Net profit: $1.83 - $0.82 (platform fee loss) = **$1.01**

### The Real Business Model

1. **Give bonus credits** to attract users (10-17% more)
2. **Markup all usage** by 20% to cover the bonus + profit
3. **Unused credits** don't roll over = pure profit if they don't use all

**You're profitable as long as users consume their credits.**

---

## Database Schema

```typescript
users {
  creditsRemaining: number  // Current balance in CENTS
  creditsIncluded: number   // Monthly allowance in CENTS
  tier: 'free' | 'pro' | 'premium' | 'ultra'
}

messages {
  inputTokens: number
  outputTokens: number
  costCents: number  // Charged amount (with 20% markup)
}

usageRecords {
  userId: string
  inputTokens: number
  outputTokens: number
  costCents: number  // Same as messages.costCents
}
```

**Important**: Despite the name "credits", everything is stored as cents (dollars × 100).

---

## Profit Guarantee Math

### Worst Case Scenario
User uses 100% of their credits on the most expensive model (Opus):

**Pro tier example ($9.99 subscription, $11 credits)**:
- User gets $11 worth of credits
- They use all $11 on Opus
- Your cost: $11 ÷ 1.20 = $9.17
- Your revenue: $9.99 (subscription)
- **Net profit**: $9.99 - $9.17 = **$0.82**

**You still profit even in the worst case.**

### Best Case Scenario
User doesn't use all credits:
- Pro tier: $9.99 revenue
- User uses $5 of their $11
- Your cost: $5 ÷ 1.20 = $4.17
- Unused credits: $6 (expires)
- **Net profit**: $9.99 - $4.17 = **$5.82**

---

## Why This Works

1. **Markup > Bonus**: 20% markup beats 10-17% bonus
2. **Credits don't roll over**: Unused = pure profit
3. **Atomic pricing**: Every API call is profitable
4. **No overage risk**: Users can't spend more than their balance

---

## Code Implementation

**Location**: `apps/marketing/lib/pricing.ts`

```typescript
export function calculateCostInCents(
  model: ModelType,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model]

  // Calculate raw Anthropic cost
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  const totalCost = inputCost + outputCost

  // Apply 20% markup
  const markedUpCost = totalCost * MARKUP_MULTIPLIER // 1.20

  // Convert to cents, round up
  return Math.max(1, Math.ceil(markedUpCost * 100))
}
```

**Minimum charge**: 1 credit (1 cent) per request

---

## Summary

- **Credits = Cents** (just terminology)
- **20% markup** on every API call
- **Profit guaranteed** even with bonus credits
- **Unused credits** = extra profit
- **No financial risk** - users prepay, can't overdraft

**Your business is profitable from day one.**

# Pricing — Prophet

> AI-powered Chrome extension with Claude AI in the browser side panel and 18 browser-automation tools. Pay-per-use credits where 1 credit = 1 cent; every plan's monthly credits equal its price.

Last updated: 2026-10-08

## Plans

### Free
- Price: $0/month
- Credits included: $0.07 (one-time Free grant on sign-up, does not renew)
- Models: Claude Haiku 5.5, Sonnet 5.5, Opus 5.5 (no model is locked behind a plan)
- Browser automation: Yes — full 18 tools
- Rate limit: 60 chat req/min
- Card required: No
- Enough to try Prophet on Claude Haiku 5.5; Sonnet and Opus need credits from a plan or a purchase

### Pro — $9.99/month
- Credits included: $10/month
- Models: All Claude models (Haiku 5.5, Sonnet 5.5, Opus 5.5)
- Browser automation: Yes — full 18 tools
- Rate limit: 120 chat req/min
- Persistent chat history
- Cancel anytime; credits reset monthly (no rollover)

### Premium — $29.99/month
- Credits included: $30/month
- Models: All Claude models
- Browser automation: Yes — full 18 tools
- Rate limit: 240 chat req/min
- Persistent chat history
- Cancel anytime; credits reset monthly (no rollover)

### Ultra — $59.99/month
- Credits included: $60/month
- Models: All Claude models
- Browser automation: Yes — full 18 tools
- Rate limit: 240 chat req/min
- Persistent chat history
- Cancel anytime; credits reset monthly (no rollover)

### Extra credits — $10 one-time
- Credits included: $10, once, with or without a plan
- Never expire; kept through renewals, plan changes and cancellation

## Credit expiry
- Free grant: one-time, on sign-up
- Subscription credits: renew monthly and do not roll over; each renewal resets them to the plan amount
- Purchased credits (extra credits): never expire
- Each Turn spends Subscription credits first, then Purchased credits

## Underlying API rates (Anthropic list rates; Prophet adds a margin and rounds up to whole credits)

| Model | Input ($/MTok) | Output ($/MTok) |
|---|---:|---:|
| Claude Haiku 5.5 (prompts up to 100K tokens) | $0.10 | $0.50 |
| Claude Haiku 5.5 (prompts over 100K tokens) | $0.50 | $2.50 |
| Claude Sonnet 5.5 | $2.00 | $10.00 |
| Claude Opus 5.5 | $4.00 | $20.00 |

## Key facts
- Credit conversion: 1 credit = $0.01. Each Turn (one call to Claude) is charged by its token usage plus Prophet's margin, rounded up to whole credits
- Minimum charge: every Turn costs at least 1 credit
- All sales final; no refunds
- No hidden fees, no per-seat pricing, no usage overages — when credits hit zero, requests stop
- Open source: https://github.com/ThanosKa/prophet
- Cost calculator: https://prophetchrome.com/tools/ai-api-cost-calculator

## Links
- Homepage: https://prophetchrome.com
- Pricing page: https://prophetchrome.com/pricing
- FAQ: https://prophetchrome.com/faq
- Chrome Web Store: https://chromewebstore.google.com/detail/prophet/febgdmgcdimmjfkfblbpjmkjfepmfkif

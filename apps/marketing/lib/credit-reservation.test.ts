import { describe, it, expect } from 'vitest'
import { estimateInputTokens, planCreditReservation } from './credit-reservation'

describe('estimateInputTokens', () => {
  it('charges 1 token per 2 UTF-8 bytes of the serialized request plus a fixed overhead', () => {
    // {"system":"","tools":[],"messages":[{"role":"user","content":"Hello"}]} is 71 bytes
    // -> 36 tokens + 500 for the tool-use system prompt Anthropic injects
    expect(
      estimateInputTokens({
        system: '',
        tools: [],
        messages: [{ role: 'user', content: 'Hello' }],
      })
    ).toBe(536)
  })

  // Reference = @anthropic-ai/tokenizer (the published legacy Claude tokenizer) x1.35,
  // the documented upper bound of the Opus 4.7+ tokenizer's inflation. Measured offline.
  const samples = [
    {
      name: 'English prose',
      text: 'The quick brown fox jumps over the lazy dog. Please open my Gmail inbox, find the latest invoice from Stripe, and download the PDF attachment to my desktop. Then summarize the total amount due and the due date in one sentence.',
      referenceTokens: 65,
    },
    {
      name: 'Chinese',
      text: '请打开我的邮箱，找到最新的发票，并下载附件。然后用一句话总结应付总额和到期日期。这是一个测试句子，用于估算令牌数量。',
      referenceTokens: 65,
    },
    {
      name: 'Japanese',
      text: 'メールボックスを開いて、最新の請求書を見つけ、添付ファイルをダウンロードしてください。その後、合計金額と支払期日を一文で要約してください。',
      referenceTokens: 95,
    },
    {
      name: 'accessibility snapshot tool result',
      text: '[1_0] RootWebArea "Inbox (3) - Gmail" focusable\n  [1_1] link "Skip to content" url="https://mail.google.com/#inbox"\n  [1_2] button "Main menu" expanded=false\n  [1_3] textbox "Search mail" value=""\n  [1_4] row "Stripe, Your invoice #4821 is ready, 10:42 AM" selectable\n  [1_5] checkbox "Select" checked=false\n  [1_6] link "Invoice INV-4821.pdf" url="https://mail.google.com/mail/u/0/?ui=2&ik=abc123&attid=0.1"',
      referenceTokens: 216,
    },
    {
      name: 'code',
      text: 'function calculateCostInCredits(model, inputTokens, outputTokens) {\n  const pricing = MODEL_PRICING[model];\n  if (!pricing) throw new Error(`Unknown model: ${model}`);\n  return Math.max(1, Math.ceil(((inputTokens / 1e6) * pricing.input + (outputTokens / 1e6) * pricing.output) * 1.2 * 100));\n}',
      referenceTokens: 121,
    },
  ]

  it.each(samples)('does not underestimate $name', ({ text, referenceTokens }) => {
    const withText = estimateInputTokens({
      system: '',
      tools: [],
      messages: [{ role: 'user', content: text }],
    })
    const empty = estimateInputTokens({
      system: '',
      tools: [],
      messages: [{ role: 'user', content: '' }],
    })

    expect(withText - empty).toBeGreaterThanOrEqual(referenceTokens)
  })

  it('counts an image as a flat 4800-token allowance, not by its base64 size', () => {
    const textOnly = estimateInputTokens({
      system: '',
      tools: [],
      messages: [{ role: 'user', content: [{ type: 'text', text: 'What is this?' }] }],
    })
    const withImage = estimateInputTokens({
      system: '',
      tools: [],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/png', data: 'A'.repeat(2_000_000) },
            },
            { type: 'text', text: 'What is this?' },
          ],
        },
      ],
    })

    expect(withImage - textOnly).toBeGreaterThanOrEqual(4800)
    expect(withImage - textOnly).toBeLessThan(4900)
  })

  it('includes the system prompt and tool definitions', () => {
    const bare = estimateInputTokens({ system: '', tools: [], messages: [] })
    const withSystem = estimateInputTokens({ system: 'x'.repeat(10_000), tools: [], messages: [] })

    expect(withSystem - bare).toBe(5000)
  })
})

describe('planCreditReservation', () => {
  it('reserves the full worst case for a small Haiku turn and keeps max_tokens', () => {
    // (3000 x $1 + 4096 x $5) / 1M = $0.02348 -> x1.2 = 2.82c -> 3 credits
    const plan = planCreditReservation({
      model: 'claude-haiku-4-5',
      balanceCents: 1000,
      estimatedInputTokens: 3000,
      maxTokens: 4096,
      minTokens: 4096,
      webSearchMaxUses: 0,
    })

    expect(plan).toEqual({ ok: true, reserveCents: 3, maxTokens: 4096 })
  })

  it('refuses a free account on Opus 5.5 with 30K input tokens: even the floor costs 25 credits', () => {
    // input  30000 x $4  / 1M = $0.12
    // floor   4096 x $20 / 1M = $0.08192
    // ($0.20192) x1.2 = 24.23c -> 25 credits > 20
    const plan = planCreditReservation({
      model: 'claude-opus-5-5',
      balanceCents: 20,
      estimatedInputTokens: 30_000,
      maxTokens: 16_000,
      minTokens: 4096,
      webSearchMaxUses: 0,
    })

    expect(plan).toEqual({ ok: false, reason: 'INSUFFICIENT_BALANCE', requiredCents: 25 })
  })

  it('shrinks max_tokens on Opus 5.5 to what a 20-credit balance affords', () => {
    // 20 credits buy $0.1667 of API cost; input 5000 x $4 / 1M = $0.02 leaves
    // $0.1467 / ($20 / 1M) = 7333 output tokens (full 16000 would cost 41 credits)
    const plan = planCreditReservation({
      model: 'claude-opus-5-5',
      balanceCents: 20,
      estimatedInputTokens: 5000,
      maxTokens: 16_000,
      minTokens: 4096,
      webSearchMaxUses: 0,
    })

    expect(plan).toEqual({ ok: true, reserveCents: 20, maxTokens: 7333 })
  })

  describe('at the max_tokens floor (Sonnet 5.5, 2000 input, floor 4096)', () => {
    // floor: (2000 x $2 + 4096 x $10) / 1M = $0.04496 -> x1.2 = 5.40c -> 6 credits
    const sonnetTurn = {
      model: 'claude-sonnet-5-5',
      estimatedInputTokens: 2000,
      maxTokens: 16_000,
      minTokens: 4096,
      webSearchMaxUses: 0,
    } as const

    it('accepts a balance of exactly the floor cost and grants the most it buys', () => {
      // 6 credits = $0.05 -> ($0.05 - $0.004) / ($10 / 1M) = 4600 output tokens
      expect(planCreditReservation({ ...sonnetTurn, balanceCents: 6 })).toEqual({
        ok: true,
        reserveCents: 6,
        maxTokens: 4600,
      })
    })

    it('refuses one credit below the floor cost', () => {
      expect(planCreditReservation({ ...sonnetTurn, balanceCents: 5 })).toEqual({
        ok: false,
        reason: 'INSUFFICIENT_BALANCE',
        requiredCents: 6,
      })
    })
  })

  it('refuses an account that is already negative', () => {
    const plan = planCreditReservation({
      model: 'claude-haiku-4-5',
      balanceCents: -31,
      estimatedInputTokens: 10,
      maxTokens: 4096,
      minTokens: 4096,
      webSearchMaxUses: 0,
    })

    expect(plan.ok).toBe(false)
  })

  it('reserves every allowed web search on top of tokens', () => {
    // (1000 x $1 + 4096 x $5) / 1M + 5 searches x $0.01 = $0.07148 -> x1.2 = 8.58c -> 9
    const plan = planCreditReservation({
      model: 'claude-haiku-4-5',
      balanceCents: 1000,
      estimatedInputTokens: 1000,
      maxTokens: 4096,
      minTokens: 4096,
      webSearchMaxUses: 5,
    })

    expect(plan).toEqual({ ok: true, reserveCents: 9, maxTokens: 4096 })
  })
})

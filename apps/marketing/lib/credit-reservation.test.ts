import { describe, it, expect } from 'vitest'
import { estimateInputTokens, planCreditReservation } from './credit-reservation'

describe('estimateInputTokens', () => {
  it('charges 1 token per 2 UTF-8 bytes of the serialized request plus a fixed overhead', () => {
    expect(
      estimateInputTokens({
        system: '',
        tools: [],
        messages: [{ role: 'user', content: 'Hello' }],
      })
    ).toBe(536)
  })

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
      name: 'Greek',
      text: 'Καλημέρα, θέλω να μου γράψεις μια περίληψη για την ιστορία της Αθήνας και των αρχαίων Ελλήνων φιλοσόφων.',
      referenceTokens: 157,
    },
    {
      name: 'Greek mixed with English names',
      text: 'Άνοιξε το Gmail μου, βρες το τελευταίο τιμολόγιο από τη Stripe και κατέβασε το συνημμένο PDF στην επιφάνεια εργασίας. Μετά γράψε σε μία πρόταση το συνολικό ποσό και την ημερομηνία λήξης.',
      referenceTokens: 257,
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
  it('prices the cached prefix at the cache-read rate and the rest at the cache-write rate', () => {
    const plan = planCreditReservation({
      model: 'claude-sonnet-5-5',
      balanceCents: 1000,
      cachedPrefixTokens: 40_000,
      restTokens: 2000,
      maxTokens: 4096,
      minTokens: 4096,
      webSearchMaxUses: 0,
    })

    expect(plan).toEqual({ ok: true, reserveCents: 7, maxTokens: 4096 })
  })

  it('prices a first Turn, which has no cached prefix, at the cache-write rate', () => {
    const plan = planCreditReservation({
      model: 'claude-sonnet-5-5',
      balanceCents: 1000,
      cachedPrefixTokens: 0,
      restTokens: 10_000,
      maxTokens: 4096,
      minTokens: 4096,
      webSearchMaxUses: 0,
    })

    expect(plan).toEqual({ ok: true, reserveCents: 9, maxTokens: 4096 })
  })

  it('moves a Haiku prompt onto the long-prompt card when prefix and rest together pass 100K', () => {
    const plan = planCreditReservation({
      model: 'claude-haiku-5-5',
      balanceCents: 1000,
      cachedPrefixTokens: 90_000,
      restTokens: 20_000,
      maxTokens: 4096,
      minTokens: 4096,
      webSearchMaxUses: 0,
    })

    expect(plan).toEqual({ ok: true, reserveCents: 4, maxTokens: 4096 })
  })

  it('reserves the full worst case for a small Haiku turn and keeps max_tokens', () => {
    const plan = planCreditReservation({
      model: 'claude-haiku-5-5',
      balanceCents: 1000,
      cachedPrefixTokens: 0,
      restTokens: 3000,
      maxTokens: 4096,
      minTokens: 4096,
      webSearchMaxUses: 0,
    })

    expect(plan).toEqual({ ok: true, reserveCents: 1, maxTokens: 4096 })
  })

  it('reserves a Haiku turn whose estimated prompt passes 100K at the long-prompt rates', () => {
    const plan = planCreditReservation({
      model: 'claude-haiku-5-5',
      balanceCents: 1000,
      cachedPrefixTokens: 0,
      restTokens: 150_000,
      maxTokens: 16_000,
      minTokens: 4096,
      webSearchMaxUses: 0,
    })

    expect(plan).toEqual({ ok: true, reserveCents: 17, maxTokens: 16_000 })
  })

  it('refuses a free account on Opus 5.5 with a 30K first-Turn prompt: even the floor costs 29 credits', () => {
    const plan = planCreditReservation({
      model: 'claude-opus-5-5',
      balanceCents: 20,
      cachedPrefixTokens: 0,
      restTokens: 30_000,
      maxTokens: 16_000,
      minTokens: 4096,
      webSearchMaxUses: 0,
    })

    expect(plan).toEqual({ ok: false, reason: 'INSUFFICIENT_BALANCE', requiredCents: 29 })
  })

  it('shrinks max_tokens on Opus 5.5 to what a 20-credit balance affords', () => {
    const plan = planCreditReservation({
      model: 'claude-opus-5-5',
      balanceCents: 20,
      cachedPrefixTokens: 0,
      restTokens: 5000,
      maxTokens: 16_000,
      minTokens: 4096,
      webSearchMaxUses: 0,
    })

    expect(plan).toEqual({ ok: true, reserveCents: 20, maxTokens: 6750 })
  })

  describe('at the max_tokens floor (Sonnet 5.5, 2000-token first Turn, floor 4096)', () => {
    const sonnetTurn = {
      model: 'claude-sonnet-5-5',
      cachedPrefixTokens: 0,
      restTokens: 2000,
      maxTokens: 16_000,
      minTokens: 4096,
      webSearchMaxUses: 0,
    } as const

    it('accepts a balance of exactly the floor cost and grants the most it buys', () => {
      expect(planCreditReservation({ ...sonnetTurn, balanceCents: 6 })).toEqual({
        ok: true,
        reserveCents: 6,
        maxTokens: 4300,
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
      model: 'claude-haiku-5-5',
      balanceCents: -31,
      cachedPrefixTokens: 0,
      restTokens: 10,
      maxTokens: 4096,
      minTokens: 4096,
      webSearchMaxUses: 0,
    })

    expect(plan.ok).toBe(false)
  })

  it('reserves every allowed web search on top of tokens', () => {
    const plan = planCreditReservation({
      model: 'claude-haiku-5-5',
      balanceCents: 1000,
      cachedPrefixTokens: 0,
      restTokens: 1000,
      maxTokens: 4096,
      minTokens: 4096,
      webSearchMaxUses: 5,
    })

    expect(plan).toEqual({ ok: true, reserveCents: 7, maxTokens: 4096 })
  })
})

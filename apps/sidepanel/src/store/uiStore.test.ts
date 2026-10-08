import { describe, it, expect, beforeEach } from 'vitest'
import { CLAUDE_MODELS, DEFAULT_AGENT_MODEL } from '@prophet/shared'
import { selectMaxContextTokens, useUIStore } from './uiStore'

async function rehydrateFrom(state: unknown) {
  localStorage.setItem('prophet-ui-store', JSON.stringify({ state, version: 0 }))
  await useUIStore.persist.rehydrate()
}

describe('uiStore persisted state', () => {
  beforeEach(() => {
    localStorage.clear()
    useUIStore.setState({ selectedModel: DEFAULT_AGENT_MODEL, theme: 'dark', enableThinking: false })
  })

  it('maps a model id saved by an earlier build onto the current model', async () => {
    await rehydrateFrom({ selectedModel: 'claude-haiku-4-5', theme: 'light', enableThinking: true })

    expect(useUIStore.getState()).toMatchObject({
      selectedModel: CLAUDE_MODELS.HAIKU,
      theme: 'light',
      enableThinking: true,
    })
  })

  it('keeps a current model id as saved', async () => {
    await rehydrateFrom({ selectedModel: CLAUDE_MODELS.OPUS })

    expect(useUIStore.getState().selectedModel).toBe(CLAUDE_MODELS.OPUS)
  })

  it('falls back to the default model for an unknown id without dropping the other fields', async () => {
    await rehydrateFrom({ selectedModel: 'gpt-4', theme: 'light' })

    expect(useUIStore.getState()).toMatchObject({ selectedModel: DEFAULT_AGENT_MODEL, theme: 'light' })
  })
})

describe('uiStore context meter', () => {
  const usage = (contextTokens: number) => ({
    contextTokens,
    contextInputTokens: contextTokens,
    contextOutputTokens: 0,
    contextReasoningTokens: 0,
    contextCachedInputTokens: 0,
  })

  beforeEach(() => {
    useUIStore.setState({ selectedModel: CLAUDE_MODELS.HAIKU })
    useUIStore.getState().resetContextTokens()
  })

  it("measures the chat against the active model's 1M-token window", () => {
    useUIStore.getState().setContextUsage(usage(500_000))

    expect(selectMaxContextTokens(useUIStore.getState())).toBe(1_000_000)
    expect(useUIStore.getState().contextTokens).toBe(500_000)
    expect(useUIStore.getState().getContextPercentage()).toBe(50)
  })

  it('uses the window of the model a legacy saved id maps to', () => {
    useUIStore.setState({ selectedModel: 'claude-sonnet-4-6' })

    expect(selectMaxContextTokens(useUIStore.getState())).toBe(1_000_000)
  })

  it("clamps the used tokens at the model's window, not at 200K", () => {
    useUIStore.getState().setContextUsage(usage(1_500_000))
    expect(useUIStore.getState().contextTokens).toBe(1_000_000)

    useUIStore.getState().resetContextTokens()
    useUIStore.getState().addContextTokens(300_000)
    useUIStore.getState().addContextUsage({ inputTokens: 300_000, outputTokens: 0 })
    expect(useUIStore.getState().contextTokens).toBe(600_000)
  })
})

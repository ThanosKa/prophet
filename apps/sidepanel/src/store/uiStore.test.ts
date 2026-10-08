import { describe, it, expect, beforeEach } from 'vitest'
import { CLAUDE_MODELS, DEFAULT_AGENT_MODEL } from '@prophet/shared'
import { useUIStore } from './uiStore'

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

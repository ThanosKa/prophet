import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_AGENT_MODEL, CLAUDE_MODELS } from '@prophet/shared'
import type { AgentModel } from '@prophet/shared'

const MAX_CONTEXT_TOKENS = 200000

type Theme = 'light' | 'dark'

interface UIState {
  drawerOpen: boolean
  contextTokens: number
  contextInputTokens: number
  contextOutputTokens: number
  contextReasoningTokens: number
  contextCachedInputTokens: number
  maxContextTokens: number
  selectedModel: AgentModel
  theme: Theme
  enableThinking: boolean

  setDrawerOpen: (open: boolean) => void
  toggleDrawer: () => void
  setSelectedModel: (model: AgentModel) => void
  addContextTokens: (tokens: number) => void
  addContextUsage: (usage: { inputTokens: number; outputTokens: number; reasoningTokens?: number; cachedInputTokens?: number }) => void
  setContextUsage: (usage: { contextTokens: number; contextInputTokens: number; contextOutputTokens: number; contextReasoningTokens: number; contextCachedInputTokens: number }) => void
  resetContextTokens: () => void
  getContextPercentage: () => number
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setEnableThinking: (enable: boolean) => void
  toggleThinking: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      drawerOpen: false,
      contextTokens: 0,
      contextInputTokens: 0,
      contextOutputTokens: 0,
      contextReasoningTokens: 0,
      contextCachedInputTokens: 0,
      maxContextTokens: MAX_CONTEXT_TOKENS,
      selectedModel: DEFAULT_AGENT_MODEL,
      theme: 'dark' as Theme,
      enableThinking: false,

      setDrawerOpen: (open) => set({ drawerOpen: open }),

      toggleDrawer: () => set((state) => ({ drawerOpen: !state.drawerOpen })),

      setSelectedModel: (model) => set({ selectedModel: model }),

      addContextTokens: (tokens) =>
        set((state) => ({
          contextTokens: Math.min(state.contextTokens + tokens, MAX_CONTEXT_TOKENS),
        })),

      addContextUsage: (usage) =>
        set((state) => {
          const input = usage.inputTokens ?? 0
          const output = usage.outputTokens ?? 0
          const reasoning = usage.reasoningTokens ?? 0
          const cached = usage.cachedInputTokens ?? 0
          const total = input + output + reasoning + cached

          return {
            contextTokens: Math.min(state.contextTokens + total, MAX_CONTEXT_TOKENS),
            contextInputTokens: state.contextInputTokens + input,
            contextOutputTokens: state.contextOutputTokens + output,
            contextReasoningTokens: state.contextReasoningTokens + reasoning,
            contextCachedInputTokens: state.contextCachedInputTokens + cached,
          }
        }),

      setContextUsage: (usage) =>
        set({
          contextTokens: Math.min(usage.contextTokens, MAX_CONTEXT_TOKENS),
          contextInputTokens: usage.contextInputTokens,
          contextOutputTokens: usage.contextOutputTokens,
          contextReasoningTokens: usage.contextReasoningTokens,
          contextCachedInputTokens: usage.contextCachedInputTokens,
        }),

      resetContextTokens: () =>
        set({
          contextTokens: 0,
          contextInputTokens: 0,
          contextOutputTokens: 0,
          contextReasoningTokens: 0,
          contextCachedInputTokens: 0,
        }),

      getContextPercentage: () => {
        const state = get()
        return (state.contextTokens / state.maxContextTokens) * 100
      },

      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),

      setEnableThinking: (enable) => set({ enableThinking: enable }),

      toggleThinking: () =>
        set((state) => ({
          enableThinking: !state.enableThinking,
        })),
    }),
    {
      name: 'prophet-ui-store',
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        theme: state.theme,
        enableThinking: state.enableThinking,
      }),
    }
  )
)

export { CLAUDE_MODELS, DEFAULT_AGENT_MODEL }
export type { AgentModel, Theme }

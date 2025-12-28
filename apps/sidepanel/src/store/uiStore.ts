import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_AGENT_MODEL, CLAUDE_MODELS } from '@prophet/shared'
import type { AgentModel } from '@prophet/shared'

const MAX_CONTEXT_TOKENS = 200000

type Theme = 'light' | 'dark'

interface UIState {
  drawerOpen: boolean
  contextTokens: number
  maxContextTokens: number
  selectedModel: AgentModel
  theme: Theme

  setDrawerOpen: (open: boolean) => void
  toggleDrawer: () => void
  setSelectedModel: (model: AgentModel) => void
  addContextTokens: (tokens: number) => void
  resetContextTokens: () => void
  getContextPercentage: () => number
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      drawerOpen: false,
      contextTokens: 0,
      maxContextTokens: MAX_CONTEXT_TOKENS,
      selectedModel: DEFAULT_AGENT_MODEL,
      theme: 'dark' as Theme,

      setDrawerOpen: (open) => set({ drawerOpen: open }),

      toggleDrawer: () => set((state) => ({ drawerOpen: !state.drawerOpen })),

      setSelectedModel: (model) => set({ selectedModel: model }),

      addContextTokens: (tokens) =>
        set((state) => ({
          contextTokens: Math.min(state.contextTokens + tokens, MAX_CONTEXT_TOKENS),
        })),

      resetContextTokens: () => set({ contextTokens: 0 }),

      getContextPercentage: () => {
        const state = get()
        return (state.contextTokens / state.maxContextTokens) * 100
      },

      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),
    }),
    {
      name: 'prophet-ui-store',
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        theme: state.theme,
      }),
    }
  )
)

export { CLAUDE_MODELS, DEFAULT_AGENT_MODEL }
export type { AgentModel, Theme }

import { create } from 'zustand'

interface AgentState {
    isActive: boolean
    actions: string[]
    abortController: AbortController | null

    setActive: (active: boolean) => void
    addAction: (action: string) => void
    clearActions: () => void
    createAbortController: () => AbortController
    abort: () => void
    reset: () => void
}

export const useAgentStore = create<AgentState>((set, get) => ({
    isActive: false,
    actions: [],
    abortController: null,

    setActive: (active) => {
        set({ isActive: active })
        if (!active) {
            get().abort()
        }
    },

    addAction: (action) => set((state) => ({
        actions: [...state.actions, action].slice(-10),
    })),

    clearActions: () => set({ actions: [] }),

    createAbortController: () => {
        const controller = new AbortController()
        set({ abortController: controller })
        return controller
    },

    abort: () => {
        const { abortController } = get()
        if (abortController) {
            abortController.abort()
            set({ abortController: null, isActive: false, actions: [] })
        }
    },

    reset: () => set({
        isActive: false,
        actions: [],
        abortController: null
    }),
}))

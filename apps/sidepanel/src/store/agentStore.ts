import { create } from 'zustand'

interface AgentState {
    isActive: boolean
    currentAction: string | null
    abortController: AbortController | null

    setActive: (active: boolean) => void
    setCurrentAction: (action: string | null) => void
    createAbortController: () => AbortController
    abort: () => void
    reset: () => void
}

export const useAgentStore = create<AgentState>((set, get) => ({
    isActive: false,
    currentAction: null,
    abortController: null,

    setActive: (active) => {
        set({ isActive: active })
        if (!active) {
            get().abort()
        }
    },

    setCurrentAction: (action) => set({ currentAction: action }),

    createAbortController: () => {
        const controller = new AbortController()
        set({ abortController: controller })
        return controller
    },

    abort: () => {
        const { abortController } = get()
        if (abortController) {
            abortController.abort()
            set({ abortController: null, isActive: false, currentAction: null })
        }
    },

    reset: () => set({
        isActive: false,
        currentAction: null,
        abortController: null
    }),
}))

import { create } from 'zustand'
import type { Chat, Message, ToolCall } from '@prophet/shared'

type StoredMessage = Message & {
  toolCalls?: ToolCall[]
}

interface ChatState {
  activeChatId: string | null
  chats: Chat[]
  messages: Record<string, StoredMessage[]>
  isStreaming: boolean
  setActiveChatId: (id: string | null) => void
  setChats: (chats: Chat[]) => void
  addChat: (chat: Chat) => void
  removeChat: (id: string) => void
  updateChat: (id: string, chat: Partial<Chat>) => void
  setMessages: (chatId: string, messages: StoredMessage[]) => void
  addMessage: (chatId: string, message: StoredMessage) => void
  updateMessage: (
    chatId: string,
    messageId: string,
    patch: Partial<StoredMessage>
  ) => void
  setStreaming: (streaming: boolean) => void
  clearMessages: (chatId: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  activeChatId: null,
  chats: [],
  messages: {},
  isStreaming: false,

  setActiveChatId: (id) => set({ activeChatId: id }),

  setChats: (chats) => set({ chats }),

  addChat: (chat) =>
    set((state) => ({
      chats: [chat, ...state.chats],
    })),

  removeChat: (id) =>
    set((state) => ({
      chats: state.chats.filter((c) => c.id !== id),
      messages: Object.fromEntries(
        Object.entries(state.messages).filter(([key]) => key !== id)
      ),
    })),

  updateChat: (id, updates) =>
    set((state) => ({
      chats: state.chats.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  setMessages: (chatId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: messages,
      },
    })),

  addMessage: (chatId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: [...(state.messages[chatId] || []), message],
      },
    })),

  updateMessage: (chatId, messageId, patch) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((m) =>
          m.id === messageId ? { ...m, ...patch } : m
        ),
      },
    })),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  clearMessages: (chatId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: [],
      },
    })),
}))

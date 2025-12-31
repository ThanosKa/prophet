import { config } from './config'
import type { ApiResponse, Chat, Message, User } from '@prophet/shared'

class ApiClient {
  private _baseUrl: string

  constructor(baseUrl: string) {
    this._baseUrl = baseUrl
  }

  get baseUrl(): string {
    return this._baseUrl
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const tokenResponse = await chrome.runtime.sendMessage({
        type: 'GET_AUTH_TOKEN',
      })
      const token = tokenResponse?.token

      // console.log('[API] Token retrieved:', token ? 'yes' : 'no')
      // console.log('[API] Request:', endpoint)

      const url = new URL(endpoint, this._baseUrl)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...(typeof options?.headers === 'object' ? options.headers : {}) },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          error: errorData.error || `HTTP ${response.status}`,
          code: errorData.code || 'HTTP_ERROR',
        }
      }

      const data = await response.json()
      return data
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Request failed',
        code: 'NETWORK_ERROR',
      }
    }
  }

  async getUser(): Promise<ApiResponse<User>> {
    return this.request('/api/auth/user')
  }

  async syncUser(): Promise<ApiResponse<{ success: boolean }>> {
    return this.request('/api/auth/sync', {
      method: 'POST',
    })
  }

  async getChats(): Promise<ApiResponse<Chat[]>> {
    return this.request('/api/chats')
  }

  async createChat(title: string): Promise<ApiResponse<Chat>> {
    return this.request('/api/chats', {
      method: 'POST',
      body: JSON.stringify({ title }),
    })
  }

  async getChat(chatId: string): Promise<ApiResponse<Chat>> {
    return this.request(`/api/chats/${chatId}`)
  }

  async deleteChat(chatId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request(`/api/chats/${chatId}`, {
      method: 'DELETE',
    })
  }

  async autoTitleChat(chatId: string): Promise<ApiResponse<{ chatId: string; title: string }>> {
    return this.request(`/api/chats/${chatId}/title/auto`, {
      method: 'POST',
    })
  }

  async getMessages(chatId: string): Promise<ApiResponse<Message[]>> {
    return this.request(`/api/chats/${chatId}/messages`)
  }

  async *streamChat(
    chatId: string,
    content: string
  ): AsyncGenerator<{ type: string; content?: string; error?: string; usage?: { inputTokens: number; outputTokens: number } }> {
    const tokenResponse = await chrome.runtime.sendMessage({
      type: 'GET_AUTH_TOKEN',
    })
    const token = tokenResponse?.token

    // console.log('[API] Stream token retrieved:', token ? 'yes' : 'no')
    // console.log('[API] Stream request:', chatId)

    const url = new URL('/api/chat/stream', this._baseUrl)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ chatId, content }),
    })

    if (!response.ok) {
      yield {
        type: 'error',
        error: `HTTP ${response.status}`,
      }
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      yield {
        type: 'error',
        error: 'No response body',
      }
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            yield data
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}

export const apiClient = new ApiClient(config.apiUrl)

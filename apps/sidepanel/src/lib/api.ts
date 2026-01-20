import { config } from './config'
import type { ApiResponse, Chat, User, PaginatedMessages } from '@prophet/shared'

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

  async getChats(limit?: number, beforeUpdatedAt?: string): Promise<ApiResponse<{ chats: Chat[]; nextCursor?: { beforeUpdatedAt: string }; hasMore: boolean }>> {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    if (beforeUpdatedAt) params.append('beforeUpdatedAt', beforeUpdatedAt)
    const query = params.toString()
    const endpoint = query ? `/api/chats?${query}` : '/api/chats'
    return this.request(endpoint)
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

  async getMessages(chatId: string, limit?: number, beforeCreatedAt?: string): Promise<ApiResponse<PaginatedMessages>> {
    const params = new URLSearchParams()
    if (limit) params.append('limit', limit.toString())
    if (beforeCreatedAt) params.append('beforeCreatedAt', beforeCreatedAt)
    const query = params.toString()
    const endpoint = query ? `/api/chats/${chatId}/messages?${query}` : `/api/chats/${chatId}/messages`
    return this.request(endpoint)
  }
}

export const apiClient = new ApiClient(config.apiUrl)

import { useQuery } from '@tanstack/react-query'
import { useUser, useAuth as useClerkAuth } from '@clerk/chrome-extension'
import { useAuthStore } from '@/store/authStore'
import { apiClient } from '@/lib/api'
import type { User } from '@prophet/shared'

interface ClerkUser {
  id: string
  emailAddresses?: Array<{ emailAddress: string }>
  firstName: string | null
  lastName: string | null
  imageUrl?: string
}

interface UseAuthReturn {
  user: User | null | undefined
  clerkUser: ClerkUser | null | undefined
  isSignedIn: boolean | undefined
  isLoading: boolean
  error: Error | null
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const { user: clerkUser, isSignedIn } = useUser()
  const { signOut } = useClerkAuth()
  const { setUser } = useAuthStore()

  // console.log('[Auth] isSignedIn:', isSignedIn, 'clerkUser:', clerkUser?.id)

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', clerkUser?.id],
    queryFn: async () => {
      // console.log('[Auth] Query running, isSignedIn:', isSignedIn)
      if (!isSignedIn) return null

      // console.log('[Auth] Syncing user...')
      await apiClient.syncUser()
      // console.log('[Auth] Sync result:', syncResult)

      // console.log('[Auth] Fetching user...')
      const response = await apiClient.getUser()
      // console.log('[Auth] User response:', response)

      if (response.data) {
        setUser(response.data)
        return response.data
      }
      return null
    },
    enabled: isSignedIn,
    staleTime: 1000 * 60 * 5,
  })

  return {
    user,
    clerkUser,
    isSignedIn,
    isLoading,
    error,
    signOut,
  }
}

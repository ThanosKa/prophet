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

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', clerkUser?.id],
    queryFn: async () => {
      if (!isSignedIn) return null

      await apiClient.syncUser()

      const response = await apiClient.getUser()
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

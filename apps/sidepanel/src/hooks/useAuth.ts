import { useQuery } from '@tanstack/react-query'
import { useUser, useSignIn, useSignUp } from '@clerk/chrome-extension'
import { useAuthStore } from '@/store/authStore'
import { apiClient } from '@/lib/api'

/**
 * Hook for managing authentication
 * Uses Clerk for auth + local user profile fetching
 */
export function useAuth() {
  const { user: clerkUser, isSignedIn } = useUser()
  const { signOut } = useSignIn()
  const { setUser } = useAuthStore()

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', clerkUser?.id],
    queryFn: async () => {
      if (!isSignedIn) return null
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

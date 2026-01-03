'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { User } from '@prophet/shared'

interface UserContextValue {
  user: User | null
  isLoading: boolean
}

const UserContext = createContext<UserContextValue | undefined>(undefined)

interface UserProviderProps {
  user: User | null
  children: ReactNode
}

export function UserProvider({ user, children }: UserProviderProps) {
  return (
    <UserContext.Provider value={{ user, isLoading: false }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

export function useUserOptional() {
  return useContext(UserContext)
}

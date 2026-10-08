'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { User } from '@prophet/shared'
import type { Balance } from '@/lib/credit-balance'

interface UserContextValue {
  /** The DB row: `creditsRemaining` is Subscription credits only; read `balance` to show a balance. */
  user: User | null
  balance: Balance | null
  isLoading: boolean
}

const UserContext = createContext<UserContextValue | undefined>(undefined)

interface UserProviderProps {
  user: User | null
  balance: Balance | null
  children: ReactNode
}

export function UserProvider({ user, balance, children }: UserProviderProps) {
  return (
    <UserContext.Provider value={{ user, balance, isLoading: false }}>
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

'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface CheckoutContextValue {
  isProcessing: boolean
  setProcessing: (value: boolean) => void
}

const CheckoutContext = createContext<CheckoutContextValue | undefined>(undefined)

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [isProcessing, setProcessing] = useState(false)

  return (
    <CheckoutContext.Provider value={{ isProcessing, setProcessing }}>
      {children}
    </CheckoutContext.Provider>
  )
}

export function useCheckout() {
  const context = useContext(CheckoutContext)
  if (!context) {
    // Return default values if used outside provider (graceful degradation)
    return { isProcessing: false, setProcessing: () => {} }
  }
  return context
}

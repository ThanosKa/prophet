'use client'

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCheckout } from '@/hooks/use-checkout'

interface BuyCreditsButtonProps {
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
  className?: string
  children?: React.ReactNode
}

export function BuyCreditsButton({
  variant = 'outline',
  size = 'lg',
  className,
  children,
}: BuyCreditsButtonProps) {
  const { isProcessing, setProcessing } = useCheckout()

  const handleBuyCredits = async () => {
    setProcessing(true)
    try {
      const response = await fetch('/api/stripe/checkout/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Failed to start checkout')
      }

      window.location.href = data.url
    } catch (error) {
      console.error('Failed to start checkout:', error)
      toast.error('Something went wrong', {
        description: 'Please try again later.',
      })
      setProcessing(false)
    }
  }

  return (
    <Button
      onClick={handleBuyCredits}
      disabled={isProcessing}
      variant={variant}
      size={size}
      className={className}
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        children || 'Buy Extra Credits'
      )}
    </Button>
  )
}

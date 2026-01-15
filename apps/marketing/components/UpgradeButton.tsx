'use client'

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCheckout } from '@/hooks/use-checkout'
import type { TierName } from '@/lib/pricing'

interface UpgradeButtonProps {
  tier: Exclude<TierName, 'free'>
  priceId: string
  variant?: 'default' | 'outline'
  className?: string
  children?: React.ReactNode
}

export function UpgradeButton({
  tier,
  priceId,
  variant = 'default',
  className,
  children,
}: UpgradeButtonProps) {
  const { isProcessing, setProcessing } = useCheckout()

  const handleUpgrade = async () => {
    setProcessing(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, tier, mode: 'subscription' }),
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
      onClick={handleUpgrade}
      disabled={isProcessing}
      variant={variant}
      className={className}
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        children || 'Upgrade'
      )}
    </Button>
  )
}

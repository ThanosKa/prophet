'use client'

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useCheckout } from '@/hooks/use-checkout'
import { startPlanChange } from '@/lib/billing-requests'
import type { TierName } from '@/lib/pricing'

interface UpgradeButtonProps {
  tier: Exclude<TierName, 'free'>
  priceId: string
  /** The user is on a paid plan: switch it in the billing portal instead of a second checkout. */
  hasPlan?: boolean
  variant?: 'default' | 'outline'
  className?: string
  children?: React.ReactNode
}

export function UpgradeButton({
  tier,
  priceId,
  hasPlan = false,
  variant = 'default',
  className,
  children,
}: UpgradeButtonProps) {
  const { isProcessing, setProcessing } = useCheckout()

  const handleUpgrade = async () => {
    setProcessing(true)
    await startPlanChange({
      hasPlan,
      checkout: () =>
        fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priceId, tier, mode: 'subscription' }),
        }),
      portal: () => fetch('/api/stripe/portal', { method: 'POST' }),
      redirect: url => { window.location.href = url },
      notifyError: () => {
        toast.error('Something went wrong', { description: 'Please try again later.' })
        setProcessing(false)
      },
    })
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

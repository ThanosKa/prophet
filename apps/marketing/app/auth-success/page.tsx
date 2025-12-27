'use client'

import { Button } from '@/components/ui/button'

export default function AuthSuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="max-w-md p-8 text-center space-y-4">
        <div className="text-6xl mb-4">✓</div>
        <h1 className="text-2xl font-bold">Authentication Successful!</h1>
        <p className="text-muted-foreground">
          You can close this window and return to the Prophet extension.
        </p>
        <p className="text-sm text-muted-foreground">
          This window will close automatically in <span data-countdown className="font-semibold">3</span> seconds...
        </p>
        <Button
          onClick={() => window.close()}
          className="mt-4"
        >
          Close Now
        </Button>
      </div>
    </div>
  )
}

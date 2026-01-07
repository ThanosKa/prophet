'use client'

import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export default function AuthSuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="max-w-md p-8 text-center space-y-6">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Authentication Successful!</h1>
          <p className="text-muted-foreground">
            You're all set. Return to the Prophet extension to start chatting.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => window.close()}
            className="w-full"
            size="lg"
          >
            Close Tab
          </Button>

          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">Extension didn't update?</p>
            <p>Close the sidepanel and reopen it to complete sign-in.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

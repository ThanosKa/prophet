import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { Button } from '@/components/ui/button'
import { CheckCircle2 } from 'lucide-react'

export default async function AuthSuccessPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="max-w-md p-8 text-center space-y-6">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Authentication Successful!</h1>
          <p className="text-muted-foreground">
            You are now signed in to Prophet. Click the button below to open the extension.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            data-open-prophet
            className="w-full"
            size="lg"
          >
            Open Prophet
          </Button>

          <p className="text-xs text-muted-foreground">
            If nothing happens, please open the extension manually from your browser toolbar.
          </p>
        </div>
      </div>
    </div>
  )
}

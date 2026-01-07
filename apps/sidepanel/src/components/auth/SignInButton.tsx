import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

const SYNC_HOST = import.meta.env.VITE_SYNC_HOST || 'http://localhost:3000'

export function SignInButton() {
  const [isAuthInProgress, setIsAuthInProgress] = useState(false)

  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange }
    ) => {
      if (changes.__clerk_client_jwt?.newValue) {
        setIsAuthInProgress(false)
      }
    }

    chrome.storage.local.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.local.onChanged.removeListener(handleStorageChange)
  }, [])

  const handleSignIn = () => {
    setIsAuthInProgress(true)
    chrome.tabs.create({ url: `${SYNC_HOST}/sign-in` })
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <Button
        className="w-full"
        size="lg"
        onClick={handleSignIn}
        disabled={isAuthInProgress}
      >
        {isAuthInProgress ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Waiting for authentication...
          </>
        ) : (
          'Sign in via Prophet Website'
        )}
      </Button>
    </div>
  )
}

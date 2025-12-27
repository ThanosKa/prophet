import { Button } from '@/components/ui/button'

const SYNC_HOST = import.meta.env.VITE_SYNC_HOST || 'http://localhost:3001'

export function SignInButton() {
  const handleSignIn = () => {
    chrome.tabs.create({ url: `${SYNC_HOST}/sign-in` })
  }

  const handleSignUp = () => {
    chrome.tabs.create({ url: `${SYNC_HOST}/sign-up` })
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <Button className="w-full" size="lg" onClick={handleSignIn}>
        Sign In via Prophet Website
      </Button>
      <Button className="w-full" variant="outline" size="lg" onClick={handleSignUp}>
        Sign Up via Prophet Website
      </Button>
    </div>
  )
}

import { Button } from '@/components/ui/button'

const SYNC_HOST = import.meta.env.VITE_SYNC_HOST || 'http://localhost:3000'

export function SignInButton() {
  const handleSignIn = () => {
    chrome.tabs.create({ url: `${SYNC_HOST}/sign-in` })
    window.close()
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <Button className="w-full" size="lg" onClick={handleSignIn}>
        Login
      </Button>
    </div>
  )
}

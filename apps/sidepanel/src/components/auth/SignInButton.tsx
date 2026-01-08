import { Button } from '@/components/ui/button'
import { config } from '@/lib/config'

export function SignInButton() {
  const handleSignIn = () => {
    chrome.tabs.create({ url: `${config.apiUrl}/sign-in` })
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

import { SignInButton as ClerkSignInButton, SignUpButton as ClerkSignUpButton } from '@clerk/chrome-extension'
import { Button } from '@/components/ui/button'

export function SignInButton() {
  return (
    <div className="flex flex-col gap-2 w-full">
      <ClerkSignInButton mode="modal">
        <Button className="w-full" size="lg">
          Sign In
        </Button>
      </ClerkSignInButton>
      <ClerkSignUpButton mode="modal">
        <Button className="w-full" variant="outline" size="lg">
          Sign Up
        </Button>
      </ClerkSignUpButton>
    </div>
  )
}

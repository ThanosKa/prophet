import { UserProfile } from "@clerk/nextjs"

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Security & Settings</h2>
        <p className="text-muted-foreground">
          Manage your account security, passwords, and active sessions.
        </p>
      </div>

      <div className="flex justify-center border rounded-lg bg-card p-4 overflow-hidden">
        <UserProfile 
          path="/account/security" 
          routing="path" 
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-none border-none w-full max-w-none",
              navbar: "hidden md:flex", // Keep it for desktop if needed, but we reorder to prioritize security
              scrollBox: "rounded-none",
            },
            variables: {
              borderRadius: '0.5rem',
            }
          }}
        />
      </div>
    </div>
  )
}


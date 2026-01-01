'use client'

import { UserProfile } from '@clerk/nextjs'

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight">Security & Account</h2>
        <p className="text-muted-foreground">
          Manage your account security, connected accounts, and profile settings.
        </p>
      </div>

      <UserProfile
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'shadow-none border rounded-lg w-full',
            navbar: 'hidden',
            pageScrollBox: 'p-0',
            profilePage: 'p-4',
            profileSection__profile: 'p-0',
            profileSection__emailAddresses: 'p-0',
            profileSection__connectedAccounts: 'p-0',
            profileSection__activeDevices: 'p-0',
            profileSection__danger: 'p-0',
          },
        }}
        routing="hash"
      />
    </div>
  )
}

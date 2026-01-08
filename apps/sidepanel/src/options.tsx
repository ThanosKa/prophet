import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider, useUser, useAuth } from '@clerk/chrome-extension'
import { dark } from '@clerk/themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { config } from '@/lib/config'
import '@/globals.css'

function OptionsApp() {
    const { user, isLoaded, isSignedIn } = useUser()
    const { signOut } = useAuth()

    const handleSignOut = async () => {
        await signOut()
        // Trigger storage change to ensure sidepanel detects it
        chrome.storage.local.set({ __clerk_client_jwt: null })
        // Close the options tab
        window.close()
    }

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background p-8 flex justify-center">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight">Prophet Settings</h1>
                    <p className="text-muted-foreground mt-2">Manage your extension preferences</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Account</CardTitle>
                        <CardDescription>You are currently signed in as</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isSignedIn ? (
                            <>
                                <div className="flex items-center gap-4">
                                    {user.imageUrl && (
                                        <img
                                            src={user.imageUrl}
                                            alt="Profile"
                                            className="h-10 w-10 rounded-full"
                                        />
                                    )}
                                    <div>
                                        <p className="font-medium">
                                            {user.firstName} {user.lastName}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {user.emailAddresses[0]?.emailAddress}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={handleSignOut}
                                    >
                                        Sign Out
                                    </Button>
                                    <p className="text-xs text-muted-foreground text-center mt-2">
                                        This will sign you out of the Prophet extension.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-muted-foreground mb-4">You are not signed in.</p>
                                <Button
                                    className="w-full"
                                    onClick={() => chrome.runtime.openOptionsPage()}
                                >
                                    Open Side Panel to Log In
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ClerkProvider
            publishableKey={config.clerkPublishableKey}
            appearance={{
                baseTheme: dark,
            }}
        >
            <OptionsApp />
        </ClerkProvider>
    </React.StrictMode>
)

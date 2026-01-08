import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider, useUser, useAuth } from '@clerk/chrome-extension'
import { dark } from '@clerk/themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { config } from '@/lib/config'
import '@/globals.css'

function OptionsApp() {
    const { user, isLoaded, isSignedIn } = useUser()
    const { signOut } = useAuth()

    const handleSignOut = async () => {
        // Clear storage FIRST to trigger sidepanel reload
        await chrome.storage.local.remove('__clerk_client_jwt')
        // Tell sidepanel to reload
        chrome.runtime.sendMessage({ type: 'SIGN_OUT' })
        // Sign out from Clerk without awaiting (it tries to redirect which causes ERR_FILE_NOT_FOUND)
        signOut().catch(() => {})
    }

    const handleLogin = () => {
        chrome.tabs.create({ url: `${config.apiUrl}/sign-in` })
    }

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    // Signed out state - show login prompt
    if (!isSignedIn) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-8">
                <div className="w-full max-w-sm space-y-8 text-center">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">Prophet</h1>
                        <p className="text-muted-foreground">Your AI-powered browser assistant</p>
                    </div>

                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleLogin}
                    >
                        Login
                    </Button>

                    <p className="text-xs text-muted-foreground">
                        Secure authentication powered by Clerk
                    </p>
                </div>
            </div>
        )
    }

    // Signed in state - show account info and sign out
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
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            {user?.imageUrl && (
                                <img
                                    src={user.imageUrl}
                                    alt="Profile"
                                    className="h-10 w-10 rounded-full"
                                />
                            )}
                            <div>
                                <p className="font-medium">
                                    {user?.firstName} {user?.lastName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {user?.emailAddresses[0]?.emailAddress}
                                </p>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <Button
                                className="w-full text-white shadow"
                                style={{
                                    backgroundColor: 'oklch(0.67 0.13 38.76)',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'oklch(0.60 0.13 38.76)'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'oklch(0.67 0.13 38.76)'}
                                onClick={handleSignOut}
                            >
                                Sign Out
                            </Button>
                            <p className="text-xs text-muted-foreground text-center mt-2">
                                This will sign you out of the Prophet extension.
                            </p>
                        </div>
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
            syncHost={config.apiUrl}
            appearance={{
                baseTheme: dark,
            }}
        >
            <OptionsApp />
        </ClerkProvider>
    </React.StrictMode>
)

import { __unstable__createClerkClient } from '@clerk/chrome-extension/background'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!publishableKey) {
  console.error('[Background] VITE_CLERK_PUBLISHABLE_KEY is not set')
}

async function getToken(): Promise<string | null> {
  try {
    const clerk = await __unstable__createClerkClient({
      publishableKey,
      syncSessionWithTab: true,
    })

    if (!clerk.session) {
      console.log('[Background] No active session')
      return null
    }

    const token = await clerk.session.getToken()
    console.log('[Background] Token retrieved:', token ? 'yes' : 'no')
    return token
  } catch (error) {
    console.error('[Background] Error getting token:', error)
    return null
  }
}

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('[Background] Failed to set sidepanel behavior:', error))

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUTH_TOKEN') {
    getToken()
      .then((token) => sendResponse({ token }))
      .catch((error) => {
        console.error('[Background] Token request error:', error)
        sendResponse({ token: null })
      })
    return true
  }

  if (message.type === 'CLOSE_AUTH_TAB') {
    if (sender.tab?.id) {
      chrome.tabs.remove(sender.tab.id).catch((error) => {
        console.error('[Background] Failed to close auth tab:', error)
      })
    }
    sendResponse({ success: true })
    return true
  }
})

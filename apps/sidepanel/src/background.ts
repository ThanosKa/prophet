import { createClerkClient } from '@clerk/chrome-extension/background'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!publishableKey) {
  console.error('[Background] VITE_CLERK_PUBLISHABLE_KEY is not set')
}

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('[Background] Failed to set sidepanel behavior:', error))

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUTH_TOKEN') {
    createClerkClient({ publishableKey })
      .then((clerk) => {
        if (!clerk.session) {
          console.log('[Background] No active session')
          sendResponse({ token: null })
          return
        }
        return clerk.session.getToken()
      })
      .then((token) => {
        if (token !== undefined) {
          console.log('[Background] Token retrieved:', token ? 'yes' : 'no')
          sendResponse({ token })
        }
      })
      .catch((error: Error) => {
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

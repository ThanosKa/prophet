/**
 * Background service worker for Prophet Chrome Extension
 * Handles authentication tokens and message passing
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUTH_TOKEN') {
    // Get auth token from Chrome storage
    chrome.storage.local.get('authToken', (result) => {
      sendResponse(result.authToken || null)
    })
    return true // Keep channel open for async response
  }
})

console.log('Prophet background service worker loaded')

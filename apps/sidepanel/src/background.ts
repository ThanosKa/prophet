chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_AUTH_TOKEN') {
    chrome.storage.local.get('authToken', (result) => {
      sendResponse(result.authToken || null)
    })
    return true
  }
})

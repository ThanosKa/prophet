/**
 * Content script for Prophet Chrome Extension
 * Runs on web pages to enable side panel integration
 */

console.log('Prophet content script loaded')

// Listen for messages from the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_PAGE') {
    // Get page content and metadata
    const pageInfo = {
      title: document.title,
      url: window.location.href,
      content: document.body.innerText.substring(0, 5000), // First 5000 chars
    }
    sendResponse(pageInfo)
  }
})

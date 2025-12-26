chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ANALYZE_PAGE') {
    const pageInfo = {
      title: document.title,
      url: window.location.href,
      content: document.body.innerText.substring(0, 5000),
    }
    sendResponse(pageInfo)
  }
})

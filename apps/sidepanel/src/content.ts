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

if (window.location.pathname === '/auth-success') {
  console.log('[Prophet] Auth success page detected')

  let countdown = 3
  const updateCountdown = () => {
    const countdownElement = document.querySelector('[data-countdown]')
    if (countdownElement) {
      countdownElement.textContent = `${countdown}`
    }
  }

  const timer = setInterval(() => {
    countdown--
    updateCountdown()

    if (countdown <= 0) {
      clearInterval(timer)
      console.log('[Prophet] Closing auth tab...')

      chrome.runtime.sendMessage(
        { type: 'CLOSE_AUTH_TAB' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Prophet] Error closing tab:', chrome.runtime.lastError)
          } else {
            console.log('[Prophet] Tab close response:', response)
          }
        }
      )
    }
  }, 1000)

  const observer = new MutationObserver(updateCountdown)
  observer.observe(document.body, { childList: true, subtree: true })

  setTimeout(() => {
    updateCountdown()
    observer.disconnect()
  }, 100)
}

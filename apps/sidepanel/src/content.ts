const UID_ATTRIBUTE = 'data-prophet-nodeid'

// ============================================================================
// Highlight Styles
// ============================================================================

const HIGHLIGHT_STYLES = {
  click: {
    outline: '4px solid #3b82f6',
    outlineOffset: '2px',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)',
    transition: 'all 0.15s ease-out',
  },
  hover: {
    outline: '3px solid #3b82f6',
    outlineOffset: '2px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    transition: 'all 0.2s ease',
  },
  fill: {
    outline: '3px solid #f59e0b',
    outlineOffset: '2px',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    transition: 'all 0.2s ease',
  },
}

const ANIMATION_DURATION = 1500

// Store original styles to restore later
const originalStyles = new Map<Element, { [key: string]: string }>()
const activeAnimations = new Map<Element, number>()

// ============================================================================
// Helper Functions
// ============================================================================

function getElementByUid(uid: string): Element | null {
  return document.querySelector(`[${UID_ATTRIBUTE}="${uid}"]`)
}

function applyStyles(element: Element, styles: Record<string, string>): void {
  const htmlElement = element as HTMLElement

  // Store original styles if not already stored
  if (!originalStyles.has(element)) {
    const original: Record<string, string> = {}
    for (const key of Object.keys(styles)) {
      original[key] = htmlElement.style.getPropertyValue(key)
    }
    originalStyles.set(element, original)
  }

  // Apply new styles
  for (const [key, value] of Object.entries(styles)) {
    htmlElement.style.setProperty(key, value, 'important')
  }
}

function removeStyles(element: Element): void {
  const htmlElement = element as HTMLElement
  const original = originalStyles.get(element)

  if (original) {
    for (const [key, value] of Object.entries(original)) {
      if (value) {
        htmlElement.style.setProperty(key, value)
      } else {
        htmlElement.style.removeProperty(key)
      }
    }
    originalStyles.delete(element)
  }
}

function animateHighlight(
  element: Element,
  styles: Record<string, string>,
  duration: number = ANIMATION_DURATION
): void {
  // Cancel any existing animation
  const existingTimeout = activeAnimations.get(element)
  if (existingTimeout) {
    clearTimeout(existingTimeout)
  }

  // Apply highlight
  applyStyles(element, styles)

  // Schedule removal
  const timeout = window.setTimeout(() => {
    removeStyles(element)
    activeAnimations.delete(element)
  }, duration)

  activeAnimations.set(element, timeout)
}

function createClickRipple(x: number, y: number): void {
  const ripple = document.createElement('div')
  ripple.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(59, 130, 246, 0.6);
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
    transform: translate(-50%, -50%) scale(0);
    pointer-events: none;
    z-index: 999999;
    animation: prophet-ripple 0.8s cubic-bezier(0, 0, 0.2, 1) forwards;
  `

  // Add animation keyframes if not already added
  if (!document.getElementById('prophet-ripple-styles')) {
    const style = document.createElement('style')
    style.id = 'prophet-ripple-styles'
    style.textContent = `
      @keyframes prophet-ripple {
        0% {
          transform: translate(-50%, -50%) scale(0);
          opacity: 1;
        }
        100% {
          transform: translate(-50%, -50%) scale(4);
          opacity: 0;
        }
      }
    `
    document.head.appendChild(style)
  }

  document.body.appendChild(ripple)

  setTimeout(() => {
    ripple.remove()
  }, 600)
}

// ============================================================================
// Message Handlers
// ============================================================================

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  try {
    switch (message.type) {
      case 'ANALYZE_PAGE': {
        const pageInfo = {
          title: document.title,
          url: window.location.href,
          content: document.body.innerText.substring(0, 5000),
        }
        sendResponse(pageInfo)
        break
      }

      case 'HIGHLIGHT_ELEMENT': {
        const { uid, color } = message
        const element = getElementByUid(uid)
        if (element) {
          const customStyles = color
            ? { outline: `3px solid ${color}`, outlineOffset: '2px' }
            : HIGHLIGHT_STYLES.hover
          animateHighlight(element, customStyles, 2000)
          sendResponse({ success: true })
        } else {
          sendResponse({ success: false, error: 'Element not found' })
        }
        break
      }

      case 'CLEAR_HIGHLIGHTS': {
        for (const element of originalStyles.keys()) {
          removeStyles(element)
        }
        for (const timeout of activeAnimations.values()) {
          clearTimeout(timeout)
        }
        activeAnimations.clear()
        sendResponse({ success: true })
        break
      }

      case 'SHOW_CLICK_INDICATOR': {
        const { uid } = message
        const element = getElementByUid(uid)
        if (element) {
          const rect = element.getBoundingClientRect()
          const centerX = rect.left + rect.width / 2
          const centerY = rect.top + rect.height / 2

          animateHighlight(element, HIGHLIGHT_STYLES.click)
          createClickRipple(centerX, centerY)
          sendResponse({ success: true })
        } else {
          sendResponse({ success: false, error: 'Element not found' })
        }
        break
      }

      case 'SHOW_HOVER_INDICATOR': {
        const { uid } = message
        const element = getElementByUid(uid)
        if (element) {
          animateHighlight(element, HIGHLIGHT_STYLES.hover, 1500)
          sendResponse({ success: true })
        } else {
          sendResponse({ success: false, error: 'Element not found' })
        }
        break
      }

      case 'SHOW_FILL_INDICATOR': {
        const { uid } = message
        const element = getElementByUid(uid)
        if (element) {
          animateHighlight(element, HIGHLIGHT_STYLES.fill, 1200)
          sendResponse({ success: true })
        } else {
          sendResponse({ success: false, error: 'Element not found' })
        }
        break
      }

      default:
        return false
    }
  } catch (error) {
    console.error('[Prophet Content] Error handling message:', error)
    sendResponse({ success: false, error: String(error) })
  }

  return true
})

// ============================================================================
// Auth Success Page Handler
// ============================================================================

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

console.log('[Prophet] Content script loaded')

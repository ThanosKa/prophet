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
// Agent Overlay State
// ============================================================================

let agentOverlayContainer: HTMLDivElement | null = null
let viewportBorder: HTMLDivElement | null = null
let statusText: HTMLDivElement | null = null
let pauseButton: HTMLButtonElement | null = null

// ============================================================================
// Agent Overlay Functions
// ============================================================================

function createAgentOverlay(): void {
  if (agentOverlayContainer) return

  agentOverlayContainer = document.createElement('div')
  agentOverlayContainer.id = 'prophet-agent-overlay'

  const shadowRoot = agentOverlayContainer.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = `
    :host {
      all: initial;
    }
    
    .viewport-border {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483647;
      border: 4px solid #3b82f6;
    }
    
    @keyframes wavy-ring-1 {
      0%, 100% { opacity: 0.2; transform: scale(1); transform-origin: center; }
      50% { opacity: 0.5; transform: scale(1.02); transform-origin: center; }
    }
    
    @keyframes wavy-ring-2 {
      0%, 100% { opacity: 0.1; transform: scale(1); transform-origin: center; }
      50% { opacity: 0.3; transform: scale(1.05); transform-origin: center; }
    }
    
    /* AIPEX Glassmorphism Pattern */
    .status-container {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 12px 24px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 2147483647;
      pointer-events: none;
      animation: slide-down 0.3s ease-out;
    }
    
    @keyframes slide-down {
      from { stroke-opacity: 0; transform: translateX(-50%) translateY(-10px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    
    .status-text {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .status-text::before {
      content: '';
      width: 8px;
      height: 8px;
      background: #3b82f6;
      border-radius: 50%;
      animation: pulse-dot 1.5s ease-in-out infinite;
    }
    
    @keyframes pulse-dot {
      0%, 100% { opacity: 0.4; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.2); }
    }
    
    .pause-button {
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      border: none;
      border-radius: 30px;
      padding: 14px 40px;
      min-width: max-content;
      width: auto;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 30px rgba(239, 68, 68, 0.5);
      z-index: 2147483647;
      pointer-events: all;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      letter-spacing: 1px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      text-transform: uppercase;
      white-space: nowrap !important;
      flex-wrap: nowrap !important;
      box-sizing: border-box;
    }

    .pause-button > span {
      display: inline-block;
      white-space: nowrap !important;
      flex-shrink: 0;
    }
    
    @keyframes slide-up {
      from { opacity: 0; transform: translateX(-50%) translateY(10px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    
    .pause-button:hover {
      transform: translateX(-50%) translateY(-2px);
      box-shadow: 0 12px 32px rgba(239, 68, 68, 0.6);
    }
    
    .pause-button:active {
      transform: translateX(-50%) translateY(0);
    }

    .stop-icon {
      width: 14px;
      height: 14px;
      background: white;
      border-radius: 2px;
      flex-shrink: 0;
      display: inline-block;
    }
  `

  shadowRoot.appendChild(style)

  viewportBorder = document.createElement('div')
  viewportBorder.className = 'viewport-border'
  viewportBorder.style.display = 'none'
  // AIPEX Wavy Look SVG
  viewportBorder.innerHTML = `
    <svg style="position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible;" preserveAspectRatio="none">
      <!-- Wavy Ring 1 -->
      <rect x="0" y="0" width="100%" height="100%" fill="none" stroke="#3b82f6" stroke-width="2" 
            style="animation: wavy-ring-1 3s ease-in-out infinite; transform-box: fill-box;" />
      
      <!-- Wavy Ring 2 (Delayed) -->
      <rect x="0" y="0" width="100%" height="100%" fill="none" stroke="#3b82f6" stroke-width="1"
            style="animation: wavy-ring-2 4s ease-in-out infinite 1s; transform-box: fill-box;" />
    </svg>
  `
  shadowRoot.appendChild(viewportBorder)

  const statusContainer = document.createElement('div')
  statusContainer.className = 'status-container'
  statusContainer.style.display = 'none'
  shadowRoot.appendChild(statusContainer)

  statusText = document.createElement('div')
  statusText.className = 'status-text'
  statusContainer.appendChild(statusText)

  pauseButton = document.createElement('button')
  pauseButton.className = 'pause-button'
  pauseButton.innerHTML = '<div class="stop-icon"></div><span>Pause</span>'
  pauseButton.style.display = 'none'
  pauseButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'AGENT_ABORT' })
    hideAgentOverlay()
  })
  shadowRoot.appendChild(pauseButton)

  document.body.appendChild(agentOverlayContainer)
}

function showAgentOverlay(): void {
  createAgentOverlay()
  if (viewportBorder) viewportBorder.style.display = 'block'
  if (pauseButton) pauseButton.style.display = 'block'
}

function hideAgentOverlay(): void {
  if (viewportBorder) viewportBorder.style.display = 'none'
  if (statusText?.parentElement) statusText.parentElement.style.display = 'none'
  if (pauseButton) pauseButton.style.display = 'none'
}

function updateAgentStatus(_status: string): void {
  // Status updates are now handled by the sidepanel UI.
  // We keep this function but remove the visual update to the overlay.
}

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

      case 'AGENT_ACTIVE': {
        showAgentOverlay()
        sendResponse({ success: true })
        break
      }

      case 'AGENT_INACTIVE': {
        hideAgentOverlay()
        sendResponse({ success: true })
        break
      }

      case 'AGENT_STATUS_UPDATE': {
        const { status } = message
        if (status) {
          updateAgentStatus(status)
          sendResponse({ success: true })
        } else {
          sendResponse({ success: false, error: 'No status provided' })
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
  // console.log('[Prophet] Auth success page detected')

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
      // console.log('[Prophet] Closing auth tab...')

      chrome.runtime.sendMessage(
        { type: 'CLOSE_AUTH_TAB' },
        (_response) => {
          if (chrome.runtime.lastError) {
            console.error('[Prophet] Error closing tab:', chrome.runtime.lastError)
          } else {
            // console.log('[Prophet] Tab close response:', response)
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

// console.log('[Prophet] Content script loaded')

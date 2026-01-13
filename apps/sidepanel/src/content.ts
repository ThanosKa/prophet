import type { OpenSidePanelRequest } from './lib/agent/messages'

// Agent Overlay State
// ============================================================================

let agentOverlayContainer: HTMLDivElement | null = null
let viewportBorder: HTMLDivElement | null = null
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
      border: 3px solid #3b82f6;
      box-shadow: inset 0 0 20px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.3);
      animation: viewport-glow 3s ease-in-out infinite;
    }
    
    @keyframes viewport-glow {
      0%, 100% { 
        box-shadow: inset 0 0 15px rgba(59, 130, 246, 0.2), 0 0 15px rgba(59, 130, 246, 0.2);
        opacity: 0.7;
      }
      50% { 
        box-shadow: inset 0 0 35px rgba(59, 130, 246, 0.5), 0 0 35px rgba(59, 130, 246, 0.5);
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .viewport-border {
        animation: none;
        opacity: 0.8;
      }
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
      gap: 8px;
      text-transform: uppercase;
      white-space: nowrap !important;
      flex-wrap: nowrap !important;
      box-sizing: border-box;
    }

    .pause-button > span {
      white-space: nowrap !important;
      flex-shrink: 0;
      line-height: 1;
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

  `

  shadowRoot.appendChild(style)

  viewportBorder = document.createElement('div')
  viewportBorder.className = 'viewport-border'
  viewportBorder.style.display = 'none'
  shadowRoot.appendChild(viewportBorder)

  pauseButton = document.createElement('button')
  pauseButton.className = 'pause-button'
  pauseButton.innerHTML = '<span>Stop</span>'
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
  if (pauseButton) pauseButton.style.display = 'none'
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
  const handleOpenProphet = () => {
    const msg: OpenSidePanelRequest = { type: 'OPEN_SIDE_PANEL' }
    chrome.runtime.sendMessage(msg)
  }

  // Look for the button immediately and also observe for it (React hydration)
  const setupButtonListener = () => {
    const btn = document.querySelector('[data-open-prophet]')
    if (btn) {
      btn.addEventListener('click', handleOpenProphet)
      return true
    }
    return false
  }

  if (!setupButtonListener()) {
    const observer = new MutationObserver((_mutations: MutationRecord[], obs: MutationObserver) => {
      if (setupButtonListener()) {
        obs.disconnect()
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }
}

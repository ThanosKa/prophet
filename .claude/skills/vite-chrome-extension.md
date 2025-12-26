---
name: vite-chrome-extension
description: Chrome extension development with Vite, React 18, and CRXJS plugin. Use when building extension UI, configuring manifest, setting up side panel, or working with Chrome APIs.
---

# Vite Chrome Extension Development

## When to Use
- Setting up or modifying the Chrome extension
- Configuring manifest.json for Manifest V3
- Building side panel UI
- Working with Chrome extension APIs
- Handling extension permissions

## CRXJS Setup

### vite.config.ts
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'
import path from 'path'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
  },
})
```

### manifest.json (Manifest V3)
```json
{
  "manifest_version": 3,
  "name": "Prophet AI",
  "version": "1.0.0",
  "description": "AI-powered sidebar assistant",
  "permissions": [
    "sidePanel",
    "storage",
    "activeTab"
  ],
  "side_panel": {
    "default_path": "index.html"
  },
  "action": {
    "default_title": "Open Prophet"
  },
  "background": {
    "service_worker": "src/background.ts",
    "type": "module"
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

## Side Panel Setup

### Background Service Worker
```typescript
// src/background.ts
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id })
  }
})
```

### Side Panel Entry (React 18)
```typescript
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

## Chrome APIs Patterns

### Storage API
```typescript
// Save data
await chrome.storage.local.set({ key: value })

// Get data
const result = await chrome.storage.local.get(['key'])
const value = result.key

// Listen for changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.key) {
    console.log('New value:', changes.key.newValue)
  }
})
```

### Message Passing
```typescript
// From content script to background
chrome.runtime.sendMessage({ type: 'ACTION', payload: data })

// In background, listen
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ACTION') {
    // Handle
    sendResponse({ success: true })
  }
  return true // Keep channel open for async
})
```

## Anti-Patterns
- Never use `eval()` or inline scripts (CSP violation)
- Don't import from `node:` modules in extension code
- Avoid synchronous storage operations
- Don't hardcode API keys in extension code

## Build Output
```bash
pnpm -F @prophet/sidepanel build
# Output in packages/sidepanel/dist/
# Load unpacked extension from this folder in chrome://extensions
```

## Debugging
- Open chrome://extensions
- Enable Developer mode
- Click "Inspect views: service worker" for background logs
- Right-click side panel → Inspect for panel DevTools

# Chrome Extension Authentication

Clerk v2.0 authentication setup for Chrome extension sidepanel.

## Package

`@clerk/chrome-extension` v2.8.14+

## Setup

In `apps/sidepanel/src/main.tsx`:

```typescript
<ClerkProvider
  publishableKey={config.clerkPublishableKey}
  syncHost={config.clerkSyncHost}  // apps/sidepanel/src/lib/config.ts
  appearance={{ baseTheme: dark }}
>
```

## User Authentication Flow

1. User clicks "Login" in the sidepanel (`SignInButton.tsx`) or in the options page
2. The marketing site's `/sign-in` page opens in a new tab, and the sidepanel closes itself (`window.close()`)
3. User completes authentication (OAuth)
4. Clerk redirects to `/auth-success`, which shows an "Open Prophet" button
5. The content script (`src/content.ts`) finds `[data-open-prophet]` and sends `OPEN_SIDE_PANEL`; the background script opens the sidepanel
6. If nothing happens, the page tells the user to open the extension from the toolbar

## Auto-Reload Mechanism

An open sidepanel listens for Clerk's session token (`__clerk_client_jwt`) in `chrome.storage.local` (`App.tsx`). When it changes (sign-in or sign-out), the sidepanel calls `window.location.reload()` and ClerkProvider re-initializes with the new session state.

## Sign-Out Flow

1. The user avatar menu's settings item opens `options.html`
2. User clicks "Sign Out" in the options page (`src/options.tsx`)
3. The options page sends a `SIGN_OUT` message, which reloads an open sidepanel, then calls Clerk's `signOut()`
4. Clerk removes the session token, and the sidepanel shows the sign-in screen

## Environment Variables

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_CLERK_SYNC_HOST=  # empty in dev (falls back to VITE_API_URL); prod: Clerk Frontend API domain
```

## Clerk Dashboard Configuration

Required settings in Clerk Dashboard:

1. Navigate to "API Keys" → "Advanced" → "Allowed Origins"
2. Add `chrome-extension://<YOUR_EXTENSION_ID>` to Allowed Origins
3. Required for cross-origin session sync

## Finding Extension ID

After loading unpacked extension in Chrome:

1. Go to `chrome://extensions`
2. Find "Prophet" extension
3. Copy the ID shown below the extension name
4. Add to Clerk Dashboard Allowed Origins

## Sign-In/Sign-Up Success Pages

Configured in environment:

```bash
# apps/marketing/.env.local
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/auth-success
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/auth-success
```

The `/auth-success` page redirects to `/sign-in` when there is no session.

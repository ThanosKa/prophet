# Chrome Extension Authentication

Clerk v2.0 authentication setup for Chrome extension sidepanel.

## Package

`@clerk/chrome-extension` v2.8.14+

## Setup

In `apps/sidepanel/src/main.tsx`:

```typescript
<ClerkProvider
  publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
  syncHost={import.meta.env.VITE_SYNC_HOST}  // Marketing site URL
  appearance={{ baseTheme: dark }}
>
```

## User Authentication Flow

1. User clicks "Sign in via Prophet Website" in sidepanel
2. Loading state appears in sidepanel ("Waiting for authentication...")
3. Opens marketing site `/sign-in` page in new tab
4. User completes authentication (OAuth)
5. Redirects to `/auth-success` page with success message
6. **If sidepanel stayed open:** Auto-reloads and syncs session (seamless)
7. **If sidepanel was closed:** User must reopen to see logged-in state
8. User closes the auth success tab manually

## Auto-Reload Mechanism

The sidepanel listens for Clerk's session token (`__clerk_client_jwt`) in `chrome.storage.local`. When authentication state changes (sign-in or sign-out), the sidepanel automatically reloads to sync the session.

**How it works:**
- **Sign-in:** Clerk stores session token in `chrome.storage.local` after successful auth
- **Sign-out:** Clerk removes session token from `chrome.storage.local`
- `chrome.storage.local.onChanged` event is received by the sidepanel
- Sidepanel detects the token change → triggers `window.location.reload()`
- ClerkProvider re-initializes with the updated session state on reload

**Limitation:** Auto-reload only works if the sidepanel remains open during authentication. If the user closes the sidepanel before auth completes, they must manually reopen it.

## Sign-Out Flow

1. User clicks "Sign out" in the user avatar dropdown menu
2. Clerk's `signOut()` function is called
3. Session token is removed from `chrome.storage.local`
4. Sidepanel detects token removal → auto-reloads
5. App shows sign-in screen (clean state)

The auto-reload ensures a clean sign-out experience with no stale data or UI inconsistencies.

## Known Limitations

**⚠️ Sidepanel Auto-Sync**: If the sidepanel is closed before authentication completes, the user must manually reopen it to see the logged-in state. This is a Clerk SDK v2.0 limitation combined with Chrome's sidepanel lifecycle.

**Workaround**: The auth UI prompts users to keep the sidepanel open during authentication for seamless auto-reload.

## Environment Variables

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_SYNC_HOST=http://localhost:3000  # Marketing site for OAuth
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

The `/auth-success` page:
- Shows success message with check icon
- Provides manual "Close Tab" button (no auto-close)
- Displays fallback instructions if sidepanel doesn't update
- User controls when to close the tab

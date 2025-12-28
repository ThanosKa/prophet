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

1. User clicks "Sign In via Prophet Website" in sidepanel
2. Opens marketing site in new tab (OAuth works there)
3. After sign-in, redirects to `/auth-success` page
4. Tab auto-closes after 3 seconds
5. **User must close and reopen sidepanel** (Clerk v2.0 limitation)
6. Session syncs → user logged in

## Known Limitations

**⚠️ Sidepanel Session Sync**: Sidepanels require close/reopen after authentication.

Per Clerk docs: "The Chrome Extension SDK currently does not fully support Sync Host on side panels."

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
- Shows success message
- Auto-closes tab after 3-second countdown
- Sends message to background script to close tab
- User must manually reopen sidepanel for session sync

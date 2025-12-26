---
name: accessibility
description: Accessibility patterns for keyboard navigation, screen readers, and WCAG compliance. Use when building forms, interactive components, buttons, or any user-facing UI to ensure all users can use the application.
---

# Accessibility Patterns

## Philosophy

Accessibility is not a feature or afterthought - it's a design principle. Accessible interfaces benefit everyone: keyboard users, screen reader users, users with cognitive disabilities, and users in constrained environments (slow networks, bright sunlight). Good accessibility is good design.

**Core principles:**
- Semantic HTML first (use `<button>` not `<div onclick>`)
- Keyboard accessible (Tab, Enter, Space, Arrows work)
- Screen reader friendly (meaningful labels, structure)
- Clear focus indicators (never remove outline without replacement)
- WCAG 2.1 AA compliant

## Semantic HTML

```typescript
// ✅ GOOD - Semantic elements
<button onClick={handleDelete}>Delete</button>
<a href="/profile">My Profile</a>
<nav>
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>
<form>
  <label htmlFor="email">Email</label>
  <input id="email" type="email" required />
  <button type="submit">Sign up</button>
</form>

// ❌ BAD - Non-semantic elements (no keyboard nav, confusing to screen readers)
<div onClick={handleDelete} role="button">Delete</div>
<div onClick={goToProfile}>My Profile</div>
<div className="nav">
  <div className="nav-item" onClick={() => navigate('/')}>Home</div>
  <div className="nav-item" onClick={() => navigate('/about')}>About</div>
</div>
<div>
  Email: <input type="text" /> {/* Missing label */}
</div>
```

**Why:** Semantic HTML provides keyboard navigation for free. Screen readers understand the structure. Browsers handle focus management.

## ARIA Labels

### ARIA Labels for Non-Text Buttons

```typescript
// ✅ GOOD - aria-label for icon-only buttons
<button aria-label="Close dialog" onClick={close}>
  <X className="h-4 w-4" />
</button>

<button aria-label="Search" type="submit">
  <Search className="h-4 w-4" />
</button>

// ✅ GOOD - aria-label for action buttons without text
<button aria-label="Delete chat" variant="destructive">
  <Trash2 className="h-4 w-4" />
</button>

// ❌ BAD - No label (screen reader reads nothing)
<button onClick={close}>
  <X className="h-4 w-4" />
</button>

// ❌ BAD - Hidden text (defeats the purpose)
<button onClick={close}>
  <X className="h-4 w-4" />
  <span className="sr-only">Close</span> {/* Better than nothing, but aria-label is cleaner */}
</button>
```

**When to use `aria-label`:**
- Icon-only buttons
- Interactive elements without visible text
- When visible text would be redundant (e.g., button next to a label)

### ARIA Labels for Complex Components

```typescript
// ✅ GOOD - aria-label for button groups
<div role="group" aria-label="Text formatting">
  <button aria-label="Bold">B</button>
  <button aria-label="Italic">I</button>
  <button aria-label="Underline">U</button>
</div>

// ✅ GOOD - aria-labelledby for sections with existing labels
<section>
  <h2 id="chat-title">Recent Conversations</h2>
  <div aria-labelledby="chat-title">
    {/* Chat list content */}
  </div>
</section>

// ✅ GOOD - aria-describedby for additional context
<input
  type="password"
  aria-describedby="password-hint"
  placeholder="Password"
/>
<small id="password-hint">At least 8 characters, 1 number, 1 symbol</small>

// ❌ BAD - Generic labels
<div role="group">
  <button>B</button>
  <button>I</button>
  <button>U</button>
</div>

// ❌ BAD - Misleading aria-label
<button aria-label="Close">✓</button> {/* aria-label should match action, not appearance */}
```

## Keyboard Navigation

### Focus Management

```typescript
// ✅ GOOD - Visible focus indicators
input:focus {
  outline: 2px solid blue;
  outline-offset: 2px;
}

button:focus-visible {
  outline: 2px solid blue;
  outline-offset: 2px;
}

// ✅ GOOD - Tab order follows visual order (default)
<form>
  <input placeholder="First name" />
  <input placeholder="Last name" />
  <button>Submit</button>
</form>
// Tab order: First → Last → Submit (natural left-to-right)

// ✅ GOOD - Custom tab order when needed
<input tabIndex={1} />
<input tabIndex={2} />
<input tabIndex={3} />

// ❌ BAD - Hidden focus indicators
button:focus {
  outline: none; {/* NEVER do this without replacement! */}
}

// ❌ BAD - Tab order fights visual layout
<div>
  <input tabIndex={2} /> {/* Second visually, first in tab order = confusing */}
  <input tabIndex={1} />
</div>
```

**Focus visibility checklist:**
- Never `outline: none` without replacement
- Sufficient contrast (WCAG AA: 3:1 minimum)
- Clear indicator (usually outline, ring, or background)
- Works in light and dark mode

### Interactive Patterns

```typescript
// ✅ GOOD - Modal dialog keyboard handling
'use client'
export function Dialog({ open, onOpenChange }: Props) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  return (
    <div role="dialog" aria-modal={open}>
      {/* Content */}
    </div>
  )
}

// ✅ GOOD - Dropdown/menu keyboard nav (Arrows, Enter, Escape)
<div
  role="listbox"
  onKeyDown={(e) => {
    if (e.key === 'ArrowDown') selectNext()
    if (e.key === 'ArrowUp') selectPrev()
    if (e.key === 'Enter') confirm()
    if (e.key === 'Escape') close()
  }}
>
  {options.map((opt) => (
    <div
      key={opt.id}
      role="option"
      aria-selected={selected.includes(opt.id)}
      onClick={() => toggle(opt.id)}
    >
      {opt.label}
    </div>
  ))}
</div>

// ✅ GOOD - Form submission with Enter
<form onSubmit={handleSubmit}>
  <input />
  <button type="submit">Send</button>
  {/* Enter in input automatically submits form */}
</form>
```

## Form Accessibility

```typescript
// ✅ GOOD - Properly labeled inputs
<div>
  <label htmlFor="email">Email address *</label>
  <input
    id="email"
    type="email"
    required
    aria-required="true"
    aria-describedby="email-error"
  />
  {error && <span id="email-error" role="alert">{error}</span>}
</div>

// ✅ GOOD - Required field indication
<label>
  Email address
  <span aria-label="required">*</span>
</label>

// ✅ GOOD - Error announcements
{error && (
  <div role="alert" className="text-red-600">
    {error}
  </div>
)}

// ❌ BAD - Input without label
<input type="email" placeholder="Email" /> {/* Placeholder is not a label */}

// ❌ BAD - Label not associated with input
<label>Email</label>
<input type="email" /> {/* Label doesn't know which input it's for */}

// ❌ BAD - Error not announced to screen readers
{error && <span>{error}</span>} {/* Screen reader won't know this is an error */}
```

## Screen Reader Support

### Meaningful Link Text

```typescript
// ✅ GOOD - Descriptive link text
<a href="/chats/123">View chat: "Planning the weekend"</a>
<a href="/profile">My Profile</a>

// ✅ GOOD - Title attribute for context
<a href="/docs" title="Read documentation">Docs</a>

// ❌ BAD - Generic link text
<a href="/chats/123">Click here</a> {/* Meaningless for screen readers */}
<a href="/profile">Link</a>

// ❌ BAD - URL as link text
<a href="https://example.com">https://example.com</a>
```

### Skip Links

```typescript
// ✅ GOOD - Skip link for keyboard users to jump over navigation
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>

<header>
  <nav>{/* Navigation */}</nav>
</header>

<main id="main-content">
  {/* Page content */}
</main>

// CSS for sr-only (screen reader only):
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.focus\:not-sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

### ARIA Live Regions

```typescript
// ✅ GOOD - Real-time status updates announced
<div aria-live="polite" aria-atomic="true">
  {typingUsers.length > 0 && (
    `${typingUsers.join(', ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`
  )}
</div>

// ✅ GOOD - Alert for important messages
<div role="alert">
  {error && `Error: ${error.message}`}
</div>

// Aria-live values:
// - polite: Announce when convenient
// - assertive: Announce immediately (for important updates)
```

## Color Contrast

```typescript
// ✅ GOOD - Sufficient contrast (WCAG AA: 4.5:1 for normal text, 3:1 for large)
<span className="text-gray-900 bg-white">High contrast text</span>

// ✅ GOOD - Don't rely on color alone
<span className="text-red-600">
  Error <AlertCircle className="inline" />
</span>

// ❌ BAD - Insufficient contrast
<span className="text-gray-400 bg-white">Low contrast</span>

// ❌ BAD - Color as only indicator
<span className="text-red-600">Required field</span> {/* Color-blind users miss this */}
```

## Testing & Validation

### Manual Testing

```bash
# Test keyboard navigation:
1. Tab through the page - does focus follow visual order?
2. Can you activate buttons with Enter/Space?
3. Can you navigate menus with arrows?
4. Can you close modals with Escape?
5. Is focus always visible?

# Test with screen reader:
1. Install NVDA (Windows free), JAWS (Windows paid), or VoiceOver (Mac)
2. Navigate page with screen reader
3. Are all interactive elements accessible?
4. Are form labels clear?
5. Are errors announced?
```

## Anti-Patterns to Avoid

- ❌ `outline: none` without replacement (removes focus indicator)
- ❌ `aria-hidden="true"` on interactive elements
- ❌ Click-only interactions (must support Enter/Space for buttons)
- ❌ Color as only indicator (use icons, text, patterns too)
- ❌ Inputs without labels (placeholder text is not a label)
- ❌ Auto-playing media or sounds
- ❌ Flashing content (can trigger seizures)
- ❌ Tab order that fights visual layout

## Quick Checklist

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] All images/icons have alt text or aria-label
- [ ] Form labels associated with inputs
- [ ] Errors announced to screen readers
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] No color as only indicator
- [ ] Links have meaningful text
- [ ] Skip links present
- [ ] Tested with keyboard navigation
- [ ] Tested with screen reader (NVDA, JAWS, or VoiceOver)

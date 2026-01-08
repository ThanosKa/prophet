---
name: visual-polish
description: Visual polish patterns for smooth UI. Use when styling components, adding animations, hover states, or making UI feel polished and responsive.
---

# Visual Polish - Smooth UI Patterns

## Animation & Transitions

### Timing Curves
```css
/* Use ease-out for elements entering/appearing */
transition-timing-function: ease-out;

/* Use ease-in-out for transforms and state changes */
transition-timing-function: ease-in-out;

/* Never use linear - feels mechanical */
```

### Duration Standards
| Type | Duration | Use Case |
|------|----------|----------|
| Micro | 150ms | Hover, focus, color changes |
| Normal | 200-300ms | Transforms, slides, fades |
| Page | 400-500ms | Page transitions, modals |

### Tailwind Patterns
```tsx
// Hover with smooth transition
<button className="transition-all duration-200 ease-out hover:scale-105 hover:shadow-md">
  Click me
</button>

// Focus ring (accessibility + polish)
<input className="transition-colors duration-150 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" />

// Card hover effect
<div className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
  <Card />
</div>
```

## Micro-interactions

### Button States
```tsx
// Loading state with spinner
<Button disabled={isPending} className="transition-all duration-150">
  {isPending ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Sending...
    </>
  ) : (
    'Send Message'
  )}
</Button>

// Click feedback (subtle scale)
<button className="active:scale-95 transition-transform duration-100">
  Submit
</button>
```

### Input Focus
```tsx
// Smooth focus transition
<input
  className="
    border border-gray-200
    transition-all duration-150
    focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
    focus:outline-none
  "
/>
```

### Toast Animations (with Framer Motion)
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.2, ease: 'easeOut' }}
>
  <Toast message={message} />
</motion.div>
```

## Design Tokens

### Spacing Scale
Use consistent spacing multiples of 4:
```
4px  (p-1)  - Tight gaps
8px  (p-2)  - Small gaps
12px (p-3)  - Compact
16px (p-4)  - Default
24px (p-6)  - Comfortable
32px (p-8)  - Spacious
48px (p-12) - Section gaps
64px (p-16) - Large sections
```

### Border Radius
```tsx
// Consistent radius scale
rounded-sm  // 4px - Subtle
rounded-md  // 8px - Default for cards, inputs
rounded-lg  // 12px - Buttons, larger elements
rounded-xl  // 16px - Modals, featured cards
rounded-full // Pills, avatars
```

### Shadows
```tsx
// Subtle - cards, dropdowns
shadow-sm

// Default - elevated cards
shadow-md

// Pronounced - modals, popovers
shadow-lg

// Hover enhancement
hover:shadow-lg
```

### Focus Rings
```tsx
// Standard focus ring
focus:ring-2 focus:ring-offset-2 focus:ring-blue-500

// Focus-visible (keyboard only)
focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500
```

## Sidepanel Constraints

Chrome extension sidepanel has limited width (~400px max).

```tsx
// Compact spacing for narrow viewport
<div className="p-3 space-y-2"> {/* Not p-6 space-y-4 */}
  <h2 className="text-sm font-medium"> {/* Smaller text */}
  <Button size="sm"> {/* Smaller buttons */}
</div>

// Prevent horizontal scroll
<div className="overflow-x-hidden">

// Truncate long text
<p className="truncate"> {/* Single line */}
<p className="line-clamp-2"> {/* Max 2 lines */}
```

## Anti-Patterns

- Linear animations (feel robotic)
- Durations > 500ms (feel sluggish)
- No hover states on interactive elements
- Missing focus indicators
- Inconsistent spacing (mixing 5px, 10px, 15px)
- Layout shift on hover (use transform instead of width/height)

## Quick Checklist

- [ ] All buttons have hover + active states
- [ ] All inputs have focus rings
- [ ] Transitions use ease-out or ease-in-out
- [ ] Durations are 150-300ms for interactions
- [ ] Spacing follows 4px scale
- [ ] Loading states on async buttons
- [ ] No horizontal scroll in sidepanel
- [ ] Focus indicators visible for keyboard nav

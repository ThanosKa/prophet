---
name: shadcn-tailwind
description: Setting up and using shadcn/ui components with Tailwind CSS. Use when adding UI components, configuring Tailwind, setting up dark mode, or customizing component styles.
---

# shadcn/ui + Tailwind CSS

## When to Use
- Adding new UI components
- Setting up Tailwind in a package
- Configuring dark mode
- Customizing shadcn components
- Styling with CSS variables

## Vite Setup (sidepanel)

### Install Tailwind
```bash
cd packages/sidepanel
pnpm add tailwindcss @tailwindcss/vite
```

### vite.config.ts
```typescript
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [react(), tailwindcss(), crx({ manifest })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### src/index.css
```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.145 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.145 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.396 0.141 25.723);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.439 0 0);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

## Adding Components

### Initialize shadcn (once per package)
```bash
pnpm dlx shadcn@latest init -c packages/sidepanel
# Select: New York style, Zinc color, CSS variables: yes
```

### Add Components
```bash
# Add individual components (NEVER install full library)
pnpm dlx shadcn@latest add button -c packages/sidepanel
pnpm dlx shadcn@latest add card input textarea -c packages/sidepanel
pnpm dlx shadcn@latest add dialog dropdown-menu -c packages/sidepanel
pnpm dlx shadcn@latest add scroll-area avatar -c packages/sidepanel

# For marketing site
pnpm dlx shadcn@latest add button card -c packages/marketing
```

## Component Usage

### Basic Button
```tsx
import { Button } from '@/components/ui/button'

export function SendButton({ onClick, disabled }: Props) {
  return (
    <Button onClick={onClick} disabled={disabled} size="sm">
      Send
    </Button>
  )
}
```

### With Variants
```tsx
<Button variant="outline" size="icon">
  <Icons.settings className="h-4 w-4" />
</Button>

<Button variant="ghost" className="w-full justify-start">
  New Chat
</Button>

<Button variant="destructive">Delete</Button>
```

### Card Component
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export function ChatCard({ title, preview }: Props) {
  return (
    <Card className="cursor-pointer hover:bg-accent">
      <CardHeader className="p-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-xs text-muted-foreground line-clamp-2">{preview}</p>
      </CardContent>
    </Card>
  )
}
```

## Dark Mode

### Theme Provider
```tsx
// src/components/theme-provider.tsx
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
}>({ theme: 'system', setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

## Customizing Components

### Extend Button Variants
```tsx
// src/components/ui/button.tsx - add custom variant
const buttonVariants = cva(
  "inline-flex items-center justify-center ...",
  {
    variants: {
      variant: {
        // ... existing variants
        gradient: "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90",
      },
    },
  }
)
```

## Anti-Patterns
- Never `pnpm add @shadcn/ui` (it's copy-paste, not a package)
- Don't modify components in node_modules
- Avoid inline styles when Tailwind classes work
- Don't forget to import component CSS

## Component Library for Prophet
Recommended components to add:
- **Chat UI**: scroll-area, avatar, textarea, button
- **Layout**: card, separator, sheet (mobile menu)
- **Forms**: input, label, form (react-hook-form)
- **Feedback**: toast, dialog, alert-dialog
- **Navigation**: dropdown-menu, tabs

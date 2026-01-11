---
name: seo-patterns
description: SEO patterns for Lighthouse 100% score. Use when building marketing pages, adding meta tags, or implementing structured data.
---

# SEO Patterns - Lighthouse 100% Score

## Required Meta Tags

Every page needs these in `<head>`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="Clear description under 160 chars" />
<title>Page Title | Prophet</title>
<link rel="canonical" href="https://yoursite.com/page" />
```

## Next.js Metadata API

### Static Metadata
```tsx
// app/page.tsx or app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Prophet - AI Chat Extension',
  description: 'AI-powered Chrome extension for intelligent conversations.',
  openGraph: {
    title: 'Prophet - AI Chat Extension',
    description: 'AI-powered Chrome extension for intelligent conversations.',
    url: 'https://prophet.app',
    siteName: 'Prophet',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prophet - AI Chat Extension',
    description: 'AI-powered Chrome extension for intelligent conversations.',
  },
}
```

### Dynamic Metadata
```tsx
// app/blog/[slug]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getPost(params.slug)
  return {
    title: `${post.title} | Prophet Blog`,
    description: post.excerpt,
  }
}
```

## Structured Data (JSON-LD)

### Organization Schema
```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Prophet',
    url: 'https://prophet.app',
    logo: 'https://prophet.app/logo.png',
  }

  return (
    <html>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### SoftwareApplication Schema (for SaaS)
```tsx
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Prophet',
  applicationCategory: 'BrowserApplication',
  operatingSystem: 'Chrome',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
}
```

### BreadcrumbList (for navigation)
```tsx
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://prophet.app' },
    { '@type': 'ListItem', position: 2, name: 'Pricing', item: 'https://prophet.app/pricing' },
  ],
}
```

## Favicons and Icons

### Next.js App Router - File-Based Convention (Recommended)

Place favicon files directly in `app/` directory. Next.js automatically generates appropriate `<head>` tags.

**Required files:**
```
app/
├── icon.png         # 32x32px or larger (square, 1:1 ratio)
├── apple-icon.png   # 180x180px (for iOS home screen)
└── favicon.ico      # 32x32px (legacy browser support)
```

**Icon requirements:**
- Must be square (1:1 aspect ratio)
- Minimum 48x48px (Google recommends)
- PNG format preferred (best transparency support)
- ICO format for legacy browsers

### Next.js Metadata API (Alternative)

```tsx
// app/layout.tsx
export const metadata: Metadata = {
  icons: {
    icon: '/logo.svg',           // Browser tab
    shortcut: '/favicon.ico',     // Legacy
    apple: '/apple-icon.png',     // iOS home screen
  },
}
```

**Important:** For best compatibility, use BOTH file-based convention AND metadata API.

### Google Search Requirements

For favicons to appear in Google search results:

1. **Size:** Minimum 48x48px (square, 1:1 ratio)
2. **Stable URL:** Don't change favicon URL frequently
3. **Crawlable:** Googlebot-Image must access the file
4. **One per site:** Google supports one favicon per hostname
5. **Formats:** PNG, SVG, ICO, JPEG, WebP, GIF (PNG recommended)

**Multi-resolution approach:**
```
public/
├── favicon-16x16.png
├── favicon-32x32.png
├── favicon-48x48.png     # Google minimum
├── favicon-192x192.png   # Android
└── favicon-512x512.png   # High-res
```

### Chrome Extension Icons

Required in `manifest.json`:

```json
{
  "icons": {
    "16": "images/icon-16.png",   // Favicon for extension pages
    "48": "images/icon-48.png",   // Extensions management page
    "128": "images/icon-128.png"  // Installation & Chrome Web Store (REQUIRED)
  },
  "action": {
    "default_icon": {
      "16": "images/icon-16.png",
      "48": "images/icon-48.png",
      "128": "images/icon-128.png"
    }
  }
}
```

**Format requirements:**
- PNG format (best transparency)
- Square icons (will be distorted if not square)
- 128x128 is REQUIRED (used during install + Web Store)
- BMP, GIF, ICO, JPEG also supported
- WebP and SVG NOT supported

**File size:** Keep under 50KB per icon for fast loading

## Technical SEO

### robots.txt (Next.js)
```tsx
// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/admin/',
    },
    sitemap: 'https://prophet.com/sitemap.xml',
  }
}
```

### Sitemap (Next.js)
```tsx
// app/sitemap.ts
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://prophet.app', lastModified: new Date(), priority: 1 },
    { url: 'https://prophet.app/pricing', lastModified: new Date(), priority: 0.8 },
    { url: 'https://prophet.app/about', lastModified: new Date(), priority: 0.5 },
  ]
}
```

### Image Alt Text
```tsx
// Always include alt text
<Image src="/hero.png" alt="Prophet AI chat interface" />

// Decorative images use empty alt
<Image src="/decoration.svg" alt="" aria-hidden="true" />
```

### Link Text
```tsx
// Descriptive link text
<Link href="/pricing">View pricing plans</Link>

// Not generic text
<Link href="/pricing">Click here</Link>
```

## Lighthouse SEO Audits (All 14)

Pass all these for 100% score:

- [ ] Has `<meta name="viewport">` tag
- [ ] Has `<title>` element
- [ ] Has `<meta name="description">`
- [ ] Page returns HTTP 200 status
- [ ] Links have descriptive text (not "click here")
- [ ] Links are crawlable (no `javascript:void(0)`)
- [ ] robots.txt is valid
- [ ] All images have alt attributes
- [ ] Document has hreflang (if multilingual)
- [ ] Document has valid canonical URL
- [ ] Font sizes are legible (16px+ base)
- [ ] Tap targets are sized appropriately (48x48px min)
- [ ] Document avoids browser plugins (Flash, etc.)
- [ ] Page isn't blocked from indexing

## Anti-Patterns

- Missing viewport meta tag
- Duplicate title/description across pages
- Generic link text ("click here", "read more")
- Images without alt text
- Blocking pages in robots.txt unintentionally
- Non-descriptive page titles ("Home", "Page 1")

## Quick Checklist

- [ ] Every page has unique title + description
- [ ] Viewport meta tag in layout
- [ ] Canonical URLs set
- [ ] robots.txt allows crawling
- [ ] sitemap.xml generated
- [ ] All images have alt text
- [ ] All links have descriptive text
- [ ] Structured data for Organization/SoftwareApplication
- [ ] Font size 16px+ for body text
- [ ] Buttons/links 48x48px minimum tap target

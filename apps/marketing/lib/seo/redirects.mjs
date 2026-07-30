// Single source of truth for permanent redirects.
//
// next.config.js serves these, and app/sitemap.ts filters them out of the sitemap.
// Sharing one list is deliberate: the six "Redirect error" pages in Search Console were
// caused by the sitemap advertising URLs that next.config.js was redirecting away, and
// only a shared list makes that combination impossible to reintroduce.

/** @typedef {{ source: string, destination: string, permanent: boolean }} Redirect */

/** @type {Redirect[]} */
export const permanentRedirects = [
  { source: '/blog/best-ai-chrome-extensions-2026', destination: '/best-ai-chrome-extensions', permanent: true },

  // Old /compare/X-alternative URLs got 404s in GSC — slugs live at /alternatives/X-alternative
  { source: '/compare/sider-alternative', destination: '/alternatives/sider-alternative', permanent: true },
  { source: '/compare/monica-ai-alternative', destination: '/alternatives/monica-ai-alternative', permanent: true },
  { source: '/compare/claude-in-chrome-alternative', destination: '/alternatives/claude-in-chrome-alternative', permanent: true },
  { source: '/compare/maxai-alternative', destination: '/alternatives/maxai-alternative', permanent: true },
  { source: '/compare/merlin-alternative', destination: '/alternatives/merlin-alternative', permanent: true },
  { source: '/compare/harpa-ai-alternative', destination: '/alternatives/harpa-ai-alternative', permanent: true },

  // Use-case slugs referenced in older blog content that never had pages
  { source: '/use-cases/browser-automation', destination: '/how-it-works', permanent: true },
  { source: '/use-cases/data-extraction', destination: '/use-cases/data-analysis', permanent: true },

  // relatedUseCases in lib/seo/professions.ts links /for/* pages to these slugs, but no
  // matching entry exists in lib/seo/use-cases.ts. Google has crawled and retried them.
  { source: '/use-cases/writing-assistance', destination: '/use-cases/writing', permanent: true },
  { source: '/use-cases/competitor-analysis', destination: '/use-cases/competitive-analysis', permanent: true },
  { source: '/use-cases/web-scraping', destination: '/use-cases/data-analysis', permanent: true },
  { source: '/use-cases/debugging', destination: '/use-cases/coding', permanent: true },
  { source: '/use-cases/troubleshooting', destination: '/use-cases/coding', permanent: true },
  { source: '/use-cases/seo-optimization', destination: '/use-cases/content-creation', permanent: true },
  { source: '/use-cases/social-media', destination: '/use-cases/content-creation', permanent: true },
  { source: '/use-cases/accessibility-audit', destination: '/use-cases/code-review', permanent: true },
  { source: '/use-cases/ux-review', destination: '/use-cases/research', permanent: true },
]

export const redirectSources = new Set(permanentRedirects.map((r) => r.source))

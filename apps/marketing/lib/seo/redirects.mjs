import { prunedRedirects } from './pruned.mjs'

/** @typedef {{ source: string, destination: string, permanent: boolean }} Redirect */

/** @type {Redirect[]} */
export const permanentRedirects = [
  { source: '/blog/best-ai-chrome-extensions-2026', destination: '/best-ai-chrome-extensions', permanent: true },

  { source: '/compare/sider-alternative', destination: '/compare/prophet-vs-sider', permanent: true },
  { source: '/compare/monica-ai-alternative', destination: '/compare/prophet-vs-monica-ai', permanent: true },
  { source: '/compare/claude-in-chrome-alternative', destination: '/compare/prophet-vs-claude-in-chrome', permanent: true },
  { source: '/compare/maxai-alternative', destination: '/compare/prophet-vs-maxai', permanent: true },
  { source: '/compare/merlin-alternative', destination: '/compare/prophet-vs-merlin', permanent: true },
  { source: '/compare/harpa-ai-alternative', destination: '/compare/prophet-vs-harpa-ai', permanent: true },

  { source: '/use-cases/browser-automation', destination: '/how-it-works', permanent: true },
  { source: '/use-cases/data-extraction', destination: '/use-cases/data-analysis', permanent: true },

  { source: '/use-cases/writing-assistance', destination: '/use-cases/writing', permanent: true },
  { source: '/use-cases/competitor-analysis', destination: '/use-cases/competitive-analysis', permanent: true },
  { source: '/use-cases/web-scraping', destination: '/use-cases/data-analysis', permanent: true },
  { source: '/use-cases/debugging', destination: '/use-cases/coding', permanent: true },
  { source: '/use-cases/troubleshooting', destination: '/use-cases/coding', permanent: true },
  { source: '/use-cases/seo-optimization', destination: '/use-cases/content-creation', permanent: true },
  { source: '/use-cases/social-media', destination: '/use-cases/content-creation', permanent: true },
  { source: '/use-cases/accessibility-audit', destination: '/use-cases/code-review', permanent: true },
  { source: '/use-cases/ux-review', destination: '/use-cases/research', permanent: true },

  ...prunedRedirects,
]

export const redirectSources = new Set(permanentRedirects.map((r) => r.source))

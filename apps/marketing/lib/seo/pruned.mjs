// Reversible SEO pruning list. Delete an entry to undo it.
//
// One list drives everything, so the pieces cannot drift apart:
//   - next.config.js    sends 'X-Robots-Tag: noindex, follow' for 'noindex' entries and a permanent
//                       redirect for 'redirect' entries (via redirects.mjs)
//   - app/sitemap.ts    leaves both kinds out of sitemap.xml
//   - hub listings      (/blog, /for) skip redirected entries so no kept page links to a redirect
//
// Keep thresholds applied when this list was written (GSC, 2026-10-01 export plus the July export):
// never prune a URL with >= 1 click in either export, or >= 100 impressions in the current one.
// The 'gsc' field is the 2026-10-01 export (90 days to 2026-09-28).

/**
 * @typedef {{ clicks: number, impressions: number }} PrunedGsc
 * @typedef {{ path: string, action: 'noindex', reason: string, gsc: PrunedGsc }} NoindexEntry
 * @typedef {{ path: string, action: 'redirect', target: string, reason: string, gsc: PrunedGsc }} RedirectEntry
 * @typedef {NoindexEntry | RedirectEntry} PrunedEntry
 */

/** @type {PrunedEntry[]} */
export const pruned = [
  { path: '/guides/summarize-articles', action: 'noindex', reason: 'Thin template guide (345-450 words), same template family as the crawled-not-indexed URLs, no clicks.', gsc: { clicks: 0, impressions: 7 } },
  { path: '/guides/fill-out-forms', action: 'noindex', reason: 'Thin template guide (345-450 words), same template family as the crawled-not-indexed URLs, no clicks.', gsc: { clicks: 0, impressions: 7 } },
  { path: '/guides/write-emails-faster', action: 'noindex', reason: 'Thin template guide (345-450 words), same template family as the crawled-not-indexed URLs, no clicks.', gsc: { clicks: 0, impressions: 1 } },
  { path: '/guides/research-topics', action: 'noindex', reason: 'Thin template guide (345-450 words), same template family as the crawled-not-indexed URLs, no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/guides/debug-code', action: 'noindex', reason: 'Thin template guide (345-450 words), same template family as the crawled-not-indexed URLs, no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/guides/review-pull-requests', action: 'noindex', reason: 'Thin template guide (345-450 words), same template family as the crawled-not-indexed URLs, no clicks.', gsc: { clicks: 0, impressions: 2 } },
  { path: '/guides/translate-webpages', action: 'noindex', reason: 'Thin template guide (345-450 words), same template family as the crawled-not-indexed URLs, no clicks.', gsc: { clicks: 0, impressions: 1 } },
  { path: '/guides/compare-products', action: 'noindex', reason: 'Thin template guide (345-450 words), same template family as the crawled-not-indexed URLs, no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/guides/extract-data', action: 'noindex', reason: 'Thin template guide (345-450 words), same template family as the crawled-not-indexed URLs, no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/guides/automate-data-entry', action: 'noindex', reason: 'Thin template guide (345-450 words), same template family as the crawled-not-indexed URLs, no clicks.', gsc: { clicks: 0, impressions: 1 } },
  { path: '/industries/ecommerce', action: 'noindex', reason: 'Thin template page (380-475 words, shared H2 skeleton), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/industries/saas', action: 'noindex', reason: 'Thin template page (380-475 words, shared H2 skeleton), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 18 } },
  { path: '/industries/healthcare', action: 'noindex', reason: 'Thin template page (380-475 words, shared H2 skeleton), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/industries/legal', action: 'noindex', reason: 'Thin template page (380-475 words, shared H2 skeleton), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/industries/finance', action: 'noindex', reason: 'Thin template page (380-475 words, shared H2 skeleton), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/industries/education', action: 'noindex', reason: 'Thin template page (380-475 words, shared H2 skeleton), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/industries/marketing-agencies', action: 'noindex', reason: 'Thin template page (380-475 words, shared H2 skeleton), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/industries/consulting', action: 'noindex', reason: 'Thin template page (380-475 words, shared H2 skeleton), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/integrations/github', action: 'noindex', reason: 'Thin template page (450-545 words), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/integrations/google-docs', action: 'noindex', reason: 'Thin template page (450-545 words), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 9 } },
  { path: '/integrations/gmail', action: 'noindex', reason: 'Thin template page (450-545 words), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 2 } },
  { path: '/integrations/notion', action: 'noindex', reason: 'Thin template page (450-545 words), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 1 } },
  { path: '/integrations/linkedin', action: 'noindex', reason: 'Thin template page (450-545 words), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 8 } },
  { path: '/integrations/reddit', action: 'noindex', reason: 'Thin template page (450-545 words), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 5 } },
  { path: '/integrations/youtube', action: 'noindex', reason: 'Thin template page (450-545 words), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/integrations/stackoverflow', action: 'noindex', reason: 'Thin template page (450-545 words), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 2 } },
  { path: '/integrations/jira', action: 'noindex', reason: 'Thin template page (450-545 words), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/integrations/shopify', action: 'noindex', reason: 'Thin template page (450-545 words), crawled-not-indexed family, no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/use-cases/research', action: 'noindex', reason: 'Template page below the keep threshold (positions 18-38), no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/use-cases/writing', action: 'noindex', reason: 'Template page below the keep threshold (positions 18-38), no clicks.', gsc: { clicks: 0, impressions: 6 } },
  { path: '/use-cases/coding', action: 'noindex', reason: 'Template page below the keep threshold (positions 18-38), no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/use-cases/studying', action: 'noindex', reason: 'Template page below the keep threshold (positions 18-38), no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/use-cases/email-drafting', action: 'noindex', reason: 'Template page below the keep threshold (positions 18-38), no clicks.', gsc: { clicks: 0, impressions: 8 } },
  { path: '/use-cases/content-creation', action: 'noindex', reason: 'Template page below the keep threshold (positions 18-38), no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/use-cases/data-analysis', action: 'noindex', reason: 'Template page below the keep threshold (positions 18-38), no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/use-cases/summarization', action: 'noindex', reason: 'Template page below the keep threshold (positions 18-38), no clicks.', gsc: { clicks: 0, impressions: 18 } },
  { path: '/use-cases/code-review', action: 'noindex', reason: 'Template page below the keep threshold (positions 18-38), no clicks.', gsc: { clicks: 0, impressions: 2 } },
  { path: '/use-cases/translation', action: 'noindex', reason: 'Template page below the keep threshold (positions 18-38), no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/use-cases/proofreading', action: 'noindex', reason: 'Template page below the keep threshold (positions 18-38), no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/use-cases/competitive-analysis', action: 'noindex', reason: 'Template page below the keep threshold (positions 18-38), no clicks.', gsc: { clicks: 0, impressions: 43 } },
  { path: '/use-cases/documentation', action: 'noindex', reason: 'Template page below the keep threshold (positions 18-38), no clicks.', gsc: { clicks: 0, impressions: 27 } },
  { path: '/use-cases/brainstorming', action: 'noindex', reason: 'Template page below the keep threshold (positions 18-38), no clicks.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/for/marketers', action: 'noindex', reason: 'Template profession page below the keep threshold, no clicks. Survives as a noindex page for users; the matching role blog post is 301ed into it.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/for/writers', action: 'noindex', reason: 'Template profession page below the keep threshold, no clicks. Survives as a noindex page for users; the matching role blog post is 301ed into it.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/for/designers', action: 'noindex', reason: 'Template profession page below the keep threshold, no clicks. Survives as a noindex page for users; the matching role blog post is 301ed into it.', gsc: { clicks: 0, impressions: 1 } },
  { path: '/for/product-managers', action: 'noindex', reason: 'Template profession page below the keep threshold, no clicks. Survives as a noindex page for users; the matching role blog post is 301ed into it.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/for/data-analysts', action: 'noindex', reason: 'Template profession page below the keep threshold, no clicks. Survives as a noindex page for users; the matching role blog post is 301ed into it.', gsc: { clicks: 0, impressions: 1 } },
  { path: '/for/founders', action: 'noindex', reason: 'Template profession page below the keep threshold, no clicks. Survives as a noindex page for users; the matching role blog post is 301ed into it.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/for/freelancers', action: 'noindex', reason: 'Template profession page below the keep threshold, no clicks. Survives as a noindex page for users; the matching role blog post is 301ed into it.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/for/customer-support', action: 'noindex', reason: 'Template profession page below the keep threshold, no clicks. Survives as a noindex page for users; the matching role blog post is 301ed into it.', gsc: { clicks: 0, impressions: 2 } },
  { path: '/alternatives/sider-alternative', action: 'noindex', reason: 'Near-duplicate of the matching /compare/prophet-vs-* page (which stays indexed), zero impressions in 3 months.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/alternatives/monica-ai-alternative', action: 'noindex', reason: 'Near-duplicate of the matching /compare/prophet-vs-* page (which stays indexed), zero impressions in 3 months.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/alternatives/claude-in-chrome-alternative', action: 'noindex', reason: 'Near-duplicate of the matching /compare/prophet-vs-* page (which stays indexed), zero impressions in 3 months.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/alternatives/maxai-alternative', action: 'noindex', reason: 'Near-duplicate of the matching /compare/prophet-vs-* page (which stays indexed), zero impressions in 3 months.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/alternatives/merlin-alternative', action: 'noindex', reason: 'Near-duplicate of the matching /compare/prophet-vs-* page (which stays indexed), zero impressions in 3 months.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/alternatives/harpa-ai-alternative', action: 'noindex', reason: 'Near-duplicate of the matching /compare/prophet-vs-* page (which stays indexed), zero impressions in 3 months.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/industries', action: 'noindex', reason: 'Hub whose every child page is noindexed; no impressions.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/blog/ai-chrome-extension-for-recruiters', action: 'noindex', reason: 'Role blog post with no /for/recruiters page to merge into; generic template, 6 impressions.', gsc: { clicks: 0, impressions: 6 } },
  { path: '/blog/ai-chrome-extension-for-developers', action: 'redirect', target: '/for/developers', reason: 'Role blog post duplicates /for/developers; the /for page is the stronger or equal page by GSC (or neither has traffic), so it is the survivor.', gsc: { clicks: 0, impressions: 14 } },
  { path: '/blog/ai-chrome-extension-for-students', action: 'redirect', target: '/for/students', reason: 'Role blog post duplicates /for/students; the /for page is the stronger or equal page by GSC (or neither has traffic), so it is the survivor.', gsc: { clicks: 0, impressions: 9 } },
  { path: '/blog/ai-chrome-extension-for-customer-support', action: 'redirect', target: '/for/customer-support', reason: 'Role blog post duplicates /for/customer-support; the /for page is the stronger or equal page by GSC (or neither has traffic), so it is the survivor.', gsc: { clicks: 0, impressions: 3 } },
  { path: '/blog/ai-chrome-extension-for-marketers', action: 'redirect', target: '/for/marketers', reason: 'Role blog post duplicates /for/marketers; the /for page is the stronger or equal page by GSC (or neither has traffic), so it is the survivor.', gsc: { clicks: 0, impressions: 22 } },
  { path: '/blog/ai-chrome-extension-for-product-managers', action: 'redirect', target: '/for/product-managers', reason: 'Role blog post duplicates /for/product-managers; the /for page is the stronger or equal page by GSC (or neither has traffic), so it is the survivor.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/blog/ai-for-freelancers-save-time', action: 'redirect', target: '/for/freelancers', reason: 'Role blog post duplicates /for/freelancers; the /for page is the stronger or equal page by GSC (or neither has traffic), so it is the survivor.', gsc: { clicks: 0, impressions: 0 } },
  { path: '/for/sales-professionals', action: 'redirect', target: '/blog/ai-chrome-extension-for-sales', reason: 'Duplicate of the sales role blog post, which clears the impression threshold (122) while this page has 2.', gsc: { clicks: 0, impressions: 2 } },
]

/** @type {Set<string>} */
export const noindexPaths = new Set(
  pruned.flatMap((entry) => (entry.action === 'noindex' ? [entry.path] : []))
)

/** @type {Array<{ source: string, destination: string, permanent: boolean }>} */
export const prunedRedirects = pruned.flatMap((entry) =>
  entry.action === 'redirect'
    ? [{ source: entry.path, destination: entry.target, permanent: true }]
    : []
)

/** @type {Set<string>} */
export const redirectedPaths = new Set(prunedRedirects.map((r) => r.source))

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isPrunedPath(path) {
  return noindexPaths.has(path) || redirectedPaths.has(path)
}

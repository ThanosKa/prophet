# SEO pruning and changes (branch seo-2026-10, 2026-10-01)

Nothing here is pushed or deployed. Everything below is reversible.

## Summary

- **65 URLs changed**: 58 noindex, 7 permanent redirects (308).
- Sitemap: 123 URLs before, 58 after (verified on the production build).
- Kept (not pruned) even though they sit in template families: `/for/developers` (3 clicks), `/for/students` (1), `/for/researchers` (1), `/use-cases/form-filling` (178 impressions), `/blog/ai-chrome-extension-for-sales` (122 impressions), plus the hubs `/guides`, `/integrations`, `/use-cases`, `/for`, `/alternatives` (each with a click or at least 95 impressions, or, for `/for`, still linking to kept pages).
- Never pruned: `/compare/prophet-vs-*`, the three `/best-*` pages, `/free-claude-ai`, `/tools/*`, core pages, and the protected blog posts (accessibility-tree, pay-per-use, is-claude-ai-free, claude-api-pricing, extensions-that-sell-your-data, use-claude-without-subscription). There is no playwright-mcp* post; the closest, `mcp-servers-vs-prophet-browser-automation`, was also left alone.
- Keep thresholds, checked by script against both CSVs: no entry has a click in either export, none has 100 or more impressions in the 2026-10-01 export. `lib/seo/pruned.test.ts` re-checks the recorded numbers and the protected list.

## How it works

One list, `apps/marketing/lib/seo/pruned.mjs` (JSDoc-typed `.mjs` because `next.config.js` cannot import `.ts`; same pattern as `redirects.mjs`):

- `next.config.js` `headers()` adds `X-Robots-Tag: noindex, follow` for every noindex path. No page file was edited for pruning.
- `lib/seo/redirects.mjs` appends the redirect entries to `permanentRedirects`.
- `app/sitemap.ts` drops every pruned path.
- `app/blog/page.tsx`, `app/blog/[slug]/page.tsx` (related posts) and `lib/seo/professions.ts` (feeds the /for hub) skip redirected paths, so no kept page links to a redirect. A crawl of all 58 sitemap URLs on the production build found 0 links to any redirect source.

**To revert any URL: delete its entry from `pruned.mjs`.** The header, sitemap entry, hub listing and redirect all come back together. To revert everything, empty the array.

## Per-URL table

Last column: clicks / impressions over the 90 days to 2026-09-28 (Pages.csv, 2026-10-01 export). Clicks in the July export are 0 for every row.

| Path | Old state | New state | Action | Reason | GSC clicks / impr |
|---|---|---|---|---|---|
| `/guides/summarize-articles` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template guide, no clicks | 0 / 7 |
| `/guides/fill-out-forms` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template guide, no clicks | 0 / 7 |
| `/guides/write-emails-faster` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template guide, no clicks | 0 / 1 |
| `/guides/research-topics` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template guide, no clicks | 0 / 0 |
| `/guides/debug-code` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template guide, no clicks | 0 / 0 |
| `/guides/review-pull-requests` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template guide, no clicks | 0 / 2 |
| `/guides/translate-webpages` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template guide, no clicks | 0 / 1 |
| `/guides/compare-products` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template guide, no clicks | 0 / 0 |
| `/guides/extract-data` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template guide, no clicks | 0 / 0 |
| `/guides/automate-data-entry` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template guide, no clicks | 0 / 1 |
| `/industries/ecommerce` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 0 |
| `/industries/saas` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 18 |
| `/industries/healthcare` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 0 |
| `/industries/legal` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 0 |
| `/industries/finance` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 0 |
| `/industries/education` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 0 |
| `/industries/marketing-agencies` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 0 |
| `/industries/consulting` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 0 |
| `/integrations/github` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 0 |
| `/integrations/google-docs` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 9 |
| `/integrations/gmail` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 2 |
| `/integrations/notion` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 1 |
| `/integrations/linkedin` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 8 |
| `/integrations/reddit` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 5 |
| `/integrations/youtube` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 0 |
| `/integrations/stackoverflow` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 2 |
| `/integrations/jira` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 0 |
| `/integrations/shopify` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Thin template page, no clicks | 0 / 0 |
| `/use-cases/research` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold, no clicks | 0 / 0 |
| `/use-cases/writing` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold, no clicks | 0 / 6 |
| `/use-cases/coding` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold, no clicks | 0 / 0 |
| `/use-cases/studying` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold, no clicks | 0 / 0 |
| `/use-cases/email-drafting` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold, no clicks | 0 / 8 |
| `/use-cases/content-creation` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold, no clicks | 0 / 0 |
| `/use-cases/data-analysis` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold, no clicks | 0 / 0 |
| `/use-cases/summarization` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold, no clicks | 0 / 18 |
| `/use-cases/code-review` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold, no clicks | 0 / 2 |
| `/use-cases/translation` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold, no clicks | 0 / 0 |
| `/use-cases/proofreading` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold, no clicks | 0 / 0 |
| `/use-cases/competitive-analysis` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold, no clicks | 0 / 43 |
| `/use-cases/documentation` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold, no clicks | 0 / 27 |
| `/use-cases/brainstorming` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold, no clicks | 0 / 0 |
| `/for/marketers` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold; role blog post 301s into it | 0 / 0 |
| `/for/writers` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold; role blog post 301s into it | 0 / 0 |
| `/for/designers` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold; role blog post 301s into it | 0 / 1 |
| `/for/product-managers` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold; role blog post 301s into it | 0 / 0 |
| `/for/data-analysts` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold; role blog post 301s into it | 0 / 1 |
| `/for/founders` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold; role blog post 301s into it | 0 / 0 |
| `/for/freelancers` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold; role blog post 301s into it | 0 / 0 |
| `/for/customer-support` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Below keep threshold; role blog post 301s into it | 0 / 2 |
| `/alternatives/sider-alternative` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Duplicate of the /compare/prophet-vs-* page, 0 impressions | 0 / 0 |
| `/alternatives/monica-ai-alternative` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Duplicate of the /compare/prophet-vs-* page, 0 impressions | 0 / 0 |
| `/alternatives/claude-in-chrome-alternative` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Duplicate of the /compare/prophet-vs-* page, 0 impressions | 0 / 0 |
| `/alternatives/maxai-alternative` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Duplicate of the /compare/prophet-vs-* page, 0 impressions | 0 / 0 |
| `/alternatives/merlin-alternative` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Duplicate of the /compare/prophet-vs-* page, 0 impressions | 0 / 0 |
| `/alternatives/harpa-ai-alternative` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Duplicate of the /compare/prophet-vs-* page, 0 impressions | 0 / 0 |
| `/industries` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Hub of all-noindexed children, no impressions | 0 / 0 |
| `/blog/ai-chrome-extension-for-recruiters` | indexable, in sitemap | 200, `X-Robots-Tag: noindex, follow`, out of sitemap | noindex | Role post with no matching /for page; generic template | 0 / 6 |
| `/blog/ai-chrome-extension-for-developers` | indexable, in sitemap | 301 (308) to `/for/developers` | redirect | Role blog post duplicates /for/developers; the /for page is the stronger or equal page by GSC (or neither has traffic), so it is the survivor. | 0 / 14 |
| `/blog/ai-chrome-extension-for-students` | indexable, in sitemap | 301 (308) to `/for/students` | redirect | Role blog post duplicates /for/students; the /for page is the stronger or equal page by GSC (or neither has traffic), so it is the survivor. | 0 / 9 |
| `/blog/ai-chrome-extension-for-customer-support` | indexable, in sitemap | 301 (308) to `/for/customer-support` | redirect | Role blog post duplicates /for/customer-support; the /for page is the stronger or equal page by GSC (or neither has traffic), so it is the survivor. | 0 / 3 |
| `/blog/ai-chrome-extension-for-marketers` | indexable, in sitemap | 301 (308) to `/for/marketers` | redirect | Role blog post duplicates /for/marketers; the /for page is the stronger or equal page by GSC (or neither has traffic), so it is the survivor. | 0 / 22 |
| `/blog/ai-chrome-extension-for-product-managers` | indexable, in sitemap | 301 (308) to `/for/product-managers` | redirect | Role blog post duplicates /for/product-managers; the /for page is the stronger or equal page by GSC (or neither has traffic), so it is the survivor. | 0 / 0 |
| `/blog/ai-for-freelancers-save-time` | indexable, in sitemap | 301 (308) to `/for/freelancers` | redirect | Role blog post duplicates /for/freelancers; the /for page is the stronger or equal page by GSC (or neither has traffic), so it is the survivor. | 0 / 0 |
| `/for/sales-professionals` | indexable, in sitemap | 301 (308) to `/blog/ai-chrome-extension-for-sales` | redirect | Duplicate of the sales role blog post, which clears the impression threshold (122) while this page has 2. | 0 / 2 |

Tie-break used for role-post duplicates: where both the blog post and the /for page are below threshold and neither has a click, the /for page survives (it is hub-linked and longer) and the blog post redirects into it. Where the blog post clears the threshold (sales, 122 impressions) the /for page redirects into it. Survivors that are themselves below threshold (marketers, product-managers, freelancers, customer-support) are noindexed, so those redirects point at a noindex page. It is still the right consolidation; drop the survivor's noindex entry if you want one indexable page per role.

## Other redirect changes (not in pruned.mjs)

In `lib/seo/redirects.mjs` the six old `/compare/X-alternative` redirects now point straight at `/compare/prophet-vs-X` (indexable) instead of `/alternatives/X-alternative` (now noindex). Revert by restoring the old destinations.

Existing redirects such as `/use-cases/data-extraction -> /use-cases/data-analysis` land on use-case pages that are now noindex. They were not touched.

## Merge-risk files touched (modified in the original tree)

- `apps/marketing/app/best-ai-chrome-extensions/page.tsx`: InstallCta import and replacement of the bottom CTA section; removed unused `Button` import; honesty rewording (A4); title "Tested" changed to "Compared".
- `apps/marketing/app/best-ai-sidebar-extensions/page.tsx`: InstallCta import, bottom CTA section replaced, removed unused `Button` import.
- `apps/marketing/app/best-claude-chrome-extensions/page.tsx`: same as above.
- `apps/marketing/app/free-claude-ai/page.tsx`: InstallCta replaces the bottom CTA (and adds two compare/best links); removed unused `Button` and `CHROME_STORE_URL` imports. The CTA copy ("$0.20 in credits ... Haiku 4.5, Sonnet 5 and Opus 5") is carried over verbatim. If the AI-model branch edits those lines, keep its text inside the `<InstallCta ...>` wrapper.
- `apps/marketing/app/for/[slug]/page.tsx`: one line, `title: { absolute: profession.title }` (removes the doubled brand).
- `apps/marketing/lib/structured-data.ts`: one line, Chrome Web Store URL added to Organization `sameAs`.

New files: `lib/seo/pruned.mjs`, `lib/seo/pruned.test.ts`, `components/InstallCta.tsx`, `scripts/indexnow.mjs`, `public/d70f122b238b657996b85f9e8e4049be.txt`. Edited but not on the risk list: `next.config.js`, `app/sitemap.ts`, `app/blog/page.tsx`, `app/blog/[slug]/page.tsx`, `components/Footer.tsx`, `lib/seo/professions.ts`, `lib/seo/redirects.mjs`, `eslint.config.js` (node globals for `scripts/*.mjs`).

## Other changes in this branch

- **A2 internal links.** Footer now links /alternatives (so every page, including home, links it), /best-claude-chrome-extensions, /best-ai-sidebar-extensions and /free-claude-ai. /free-claude-ai links /compare/prophet-vs-claude-in-chrome and /best-claude-chrome-extensions. The three /best-* pages already linked the relevant /compare pages. The /compare <-> /alternatives bidirectional link was not built: all six /alternatives/* pages have 0 impressions and are noindexed, so "both kept" never holds. If you want to keep the alternatives for "X alternative" queries, remove those six entries and add the compare -> alternatives links.
- **A3.** `components/InstallCta.tsx` (uses `CHROME_STORE_URL` from `lib/constants.ts`) on /free-claude-ai, the three /best-* pages and, through the shared blog template, every blog post including /blog/is-claude-ai-free (no edit to `lib/blog.ts`). Organization `sameAs` now includes the Chrome Web Store listing.
- **A4.** /best-ai-chrome-extensions no longer claims hands-on testing on Chrome 134, a "controlled benchmark in progress", "over 20 extensions evaluated" or "tested". It now says the ranking compares vendors' published docs, pricing pages and store listings, that Prophet is our own product, and that no controlled benchmark was run. No results were invented. **Not changed (outside the brief), same problem:** /best-ai-sidebar-extensions (about line 211, "hands-on use in May 2026"), /best-claude-chrome-extensions (about line 206, same wording), and the accessibility-tree post in `lib/blog.ts` ("our own Chrome DevTools instrumentation"). Verify or soften those too.
- **A5.** /blog now has og:image and a twitter card. /for/* titles drop the repeated brand. /industries/* titles were left alone: every industry page is noindexed, so the title no longer matters.
- **A6.** `apps/sidepanel/manifest.ts`: name "Prophet: AI Side Panel Agent", 118-character description. Full listing copy, screenshot list, promo tile and category are in `CWS-LISTING.md`.
- **A7. IndexNow (post-deploy user step).** Key file `apps/marketing/public/d70f122b238b657996b85f9e8e4049be.txt`. After this branch is deployed, run `node apps/marketing/scripts/indexnow.mjs --dry-run` to see the payload, then `node apps/marketing/scripts/indexnow.mjs`. The script refuses to submit until the key file is live on production, fetches https://prophetchrome.com/sitemap.xml and POSTs host, key, keyLocation and urlList to https://api.indexnow.org/indexnow. It was NOT run. Bing, Yandex, Seznam and Naver use IndexNow; Google does not.

## Scope B: in-extension rating prompt (BUILT)

Gate check: passed. The stream emits `done` and `execution_complete` only on the final turn (no pending tool use), and an `error` event ends the run. vitest works in `apps/sidepanel` (47 tests before, 63 after).

- `src/lib/review-prompt.ts`: pure trigger logic (`recordSuccessfulRun`, `shouldShowReviewPrompt`, `snoozeReviewPrompt`, `optOutOfReviewPrompt`, `parseReviewPromptState` type guard) and the reviews URL.
- `src/lib/review-prompt.test.ts`: 16 unit tests (5th run, snooze by 10, repeated snooze, opt-out, malformed storage).
- `src/store/reviewPromptStore.ts`: zustand store persisting to `chrome.storage.local` under `prophet-review-prompt`; every action re-reads storage first.
- `src/components/chat/ReviewPrompt.tsx`: non-modal banner above the chat input, hidden while a run is in progress. "Leave a review" opens the listing's /reviews page and opts out. "Not now" and the X snooze for 10 runs. "Don't ask again" is permanent. Same prompt for every user: no "are you happy?" step.
- Wiring: `ChatView.tsx` renders the banner; `useAgentChat.ts` records a success when the run ends with `done`/`execution_complete`, no `error` event and no abort.
- Not unit-tested: the hook wiring and the banner (the sidepanel vitest setup has no component test utilities). The success signal means "the turn finished without an error", not "the task achieved its goal"; a model that answers "I could not do that" still counts. The banner stays visible until the user picks an option.
- Revert: remove the banner line and import from `ChatView.tsx`, the added blocks in `useAgentChat.ts`, and delete the four new files.

## Before you deploy / user steps

1. Merge order: the AI-model changes ship first today. This branch touches `best-*`, `free-claude-ai`, `for/[slug]` and `structured-data.ts` (see the merge-risk list). Expect conflicts only in the best-* and free-claude-ai CTA hunks.
2. After deploy: run IndexNow (A7), resubmit the sitemap in Search Console and Bing Webmaster Tools. Do not press "Validate fix" on the crawled-not-indexed or noindex rows.
3. Switch the www redirect to permanent in Vercel Domains (still 307).
4. Republish the extension to the Chrome Web Store and paste the new listing copy (see `CWS-LISTING.md`). The rating prompt only reaches users with that release.
5. Re-judge on about 2026-12-15 (link and indexing effects lag 6-12 weeks).

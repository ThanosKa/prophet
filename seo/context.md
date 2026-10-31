# Prophet: SEO context

Το αρχείο αυτό το διαβάζει πρώτο κάθε run του SEO autopilot. Κάθε γεγονός έχει δίπλα την πηγή του. Αν μια σελίδα του site διαφωνεί με τον κώδικα, ισχύει ο κώδικας.

## Ρυθμίσεις autopilot

```
Site:          https://prophetchrome.com
Product:       Chrome side panel extension που τρέχει Claude (Haiku/Sonnet/Opus 5.5), διαβάζει τη σελίδα και κάνει ενέργειες στον browser, με pay-per-use credits. Αγοραστής: άνθρωποι που δουλεύουν όλη μέρα στον Chrome (PM, marketers, analysts, developers, φοιτητές).
Conversion:    sign-up (λογαριασμός Clerk), και μετά αγορά πλάνου ή credits
Competitors:   Claude in Chrome, Sider, Monica, Merlin, MaxAI, HARPA AI, ChatGPT sidebar/Atlas, Microsoft Copilot
Ship mode:     PR for review
Language:      Τα αρχεία στο seo/ και οι αναφορές γράφονται στα ελληνικά. Το περιεχόμενο του site μένει στα αγγλικά.
```

## Πώς είναι φτιαγμένο το site (Next.js 16 App Router, `apps/marketing`)

- Blog posts: ένα αντικείμενο `BlogPost` το καθένα, μέσα στο `apps/marketing/lib/blog.ts`. Τα `title` και `description` γίνονται `<title>`, meta και OG· το `lastModified` γίνεται `<lastmod>` στο sitemap· το `faq` γίνεται FAQ section + FAQPage JSON-LD (`app/blog/[slug]/page.tsx`).
- Programmatic σελίδες: τα δεδομένα είναι στο `lib/seo/*.ts` (comparisons, guides, integrations, professions, use-cases, industries) και τα templates στο `app/<section>/[slug]/page.tsx`.
- Οι σελίδες "best of" είναι χειρόγραφες: `app/best-ai-chrome-extensions`, `app/best-claude-chrome-extensions`, `app/best-ai-sidebar-extensions`, `app/free-claude-ai`.
- Sitemap: `app/sitemap.ts`. Οι στατικές σελίδες έχουν κοινό `TEMPLATES_LAST_UPDATED`· τα blog posts παίρνουν το `lastModified` τους.
- Robots: `app/robots.ts`. Canonicals μέσω `alternates.canonical` σε κάθε σελίδα.
- Redirects: `lib/seo/redirects.mjs`. Pruning (noindex/redirect): `lib/seo/pruned.mjs`, με ιστορικό στο `PRUNED.md`. Για να σβήσεις ή να κάνεις redirect μια σελίδα, βάλε μια εγγραφή εκεί, όχι σε άλλο σημείο.
- Structured data: `lib/structured-data.ts`, `lib/faqs.ts` (`faqNode`).
- Το `lib/pricing-copy.test.ts` αποτυγχάνει αν ξαναμπούν παλιοί ισχυρισμοί για τις τιμές.
- Κανόνες για το copy: `.claude/docs/product-marketing-context.md` (καμία αναφορά στο margin, κανένα bonus, το free δίνει μόνο $0.07).

## Προϊόν (από τον κώδικα, 2026-10-31)

| Γεγονός | Τιμή | Πηγή |
|---|---|---|
| Μοντέλα | claude-haiku-5-5, claude-sonnet-5-5, claude-opus-5-5 | `apps/marketing/lib/pricing.ts` (`ALL_MODELS`) |
| Free | $0.07 μία φορά (7 credits), αρκεί για δοκιμή στο Haiku | `pricing.ts` `TIER_CONFIG.free` |
| Pro | $9.99/μήνα, δίνει $10 credits | `TIER_CONFIG.pro` |
| Premium | $29.99/μήνα, δίνει $30 credits | `TIER_CONFIG.premium` |
| Ultra | $59.99/μήνα, δίνει $60 credits | `TIER_CONFIG.ultra` |
| Extra credits | $10 μία φορά, $10 credits, δεν λήγουν ποτέ | `EXTRA_CREDITS` |
| Credit | 1 credit = 1 cent· κάθε Turn κοστίζει τουλάχιστον 1 credit | `MINIMUM_CHARGE_CREDITS` |
| Web search | $10 ανά 1.000 αναζητήσεις, πάνω από τα tokens | `WEB_SEARCH_PRICE_PER_1K_USD` |
| Όριο Turns ανά Run | 20 | `apps/shared/schemas/agent.ts` (`MAX_AGENT_TURNS`) |
| Rate limit agent chat | Free 60/λεπτό, Pro 120, Premium και Ultra 240 | `apps/marketing/lib/ratelimit.ts` (`chatLimits`) |
| Rate limit API | Free 15/λεπτό, Pro 60, Premium και Ultra 120 | `ratelimit.ts` (`apiLimits`) |
| Εργαλεία agent | 19 εργαλεία browser + `web_search` (take_snapshot, search_snapshot, get_page_content, get_page_info, click/fill/hover_element_by_uid, navigate, go_back, go_forward, reload_page, scroll_page, list_tabs, open_new_tab, switch_tab, close_tab, wait_for_navigation, wait_for_selector, wait_for_timeout) | `apps/sidepanel/src/lib/agent/tools/*.ts`. **Το site λέει παντού "18 tools", θέλει επιβεβαίωση από τον owner (δες backlog).** |
| Πώς βλέπει τη σελίδα | Accessibility tree με UIDs, μέσω Chrome DevTools Protocol, τοπικά στον browser | `.claude/docs/patterns.md`, `apps/sidepanel/src/lib/agent/snapshot-manager.ts` |
| Έκδοση extension | 1.0.7 | `apps/sidepanel/package.json` |
| Chrome Web Store | https://chromewebstore.google.com/detail/prophet/febgdmgcdimmjfkfblbpjmkjfepmfkif | `.claude/docs/product-marketing-context.md` |
| Open source | https://github.com/ThanosKa/prophet | ίδιο |

Όρια που λέμε ανοιχτά στο copy: δεν βλέπει εικόνες, δεν λύνει CAPTCHA, δεν περνά paywalls, σταματά στα 20 Turns και ζητά "continue".

Δεν έχει επαληθευτεί: "Join 1,000+ users" (Hero). Θέλει πηγή, π.χ. τον αριθμό χρηστών στο Chrome Web Store.

## Ανταγωνιστές (επαληθευμένα στις 2026-10-31)

| Ανταγωνιστής | Τι ισχύει | Πηγή |
|---|---|---|
| Claude in Chrome (Anthropic) | Διαβάζει τη σελίδα, κάνει click, γράφει, συμπληρώνει φόρμες, από το side panel. Μόνο σε πληρωμένα πλάνα Claude (Pro και πάνω), όχι στο Free. Δουλεύει με screenshots. | https://support.claude.com/en/articles/12012173 (διαβάστηκε 2026-10-31) |
| Sider, Monica, Merlin, MaxAI | Sidebars με πολλά μοντέλα, διαβάζουν τη σελίδα αλλά δεν κάνουν ενέργειες σε αυτήν | `lib/seo/comparisons.ts` (θέλουν νέο έλεγχο τιμών, δες backlog) |
| HARPA AI | Macros, παρακολούθηση σελίδων, scraping· BYO key | `lib/seo/comparisons.ts` |
| ChatGPT (sidebar / Atlas) | Δεν έχει επαληθευτεί πώς είναι σήμερα· το site λέει "ChatGPT's official extension cannot read your page" | θέλει έλεγχο |
| Microsoft Copilot | Copilot στον Edge | `lib/seo/comparisons.ts` |

Ανταγωνιστές στα αποτελέσματα αναζήτησης για "best claude chrome extensions": ai-toolbox.co, claudekit.app (προωθεί το δικό του extension), theairankings.com, toolworthy.ai.

Snapshots των sitemaps στο `seo/competitors/<domain>.txt` (ένα URL ανά γραμμή, ταξινομημένα). Το sider.ai, το monica.im και το getmerlin.in δεν επέστρεψαν sitemap με απλό αίτημα, οπότε λείπουν.

## Πηγές δεδομένων

- Google Search Console: συνδεδεμένο (`https://prophetchrome.com/`, siteRestrictedUser).
- Ahrefs ή κάποιο παρόμοιο εργαλείο: δεν είναι συνδεδεμένο. Χωρίς αυτό δεν έχουμε μηνιαίο όγκο αναζητήσεων, δυσκολία ούτε backlinks. Στο keyword map, ο όγκος και η δυσκολία μένουν κενά.
- Sign-ups και έσοδα: `apps/marketing/scripts/seo-conversions.mjs` (production DB + Stripe, read-only, μόνο συνολικά νούμερα). Πώς τρέχει: `seo/AUTOPILOT.md`.
- Από ποια σελίδα έρχεται κάθε sign-up: δεν αποθηκεύεται πουθενά (ούτε landing page ούτε referrer). Γι' αυτό συνδέουμε τα sign-ups με το SEO μόνο μέσα από την τάση, όχι ανά σελίδα.
- ChatGPT, Perplexity, Google AI Overviews: δεν υπάρχει connector, οπότε οι έλεγχοι στο `ai-prompts.md` δεν μπορούν να γίνουν αυτόματα.
- Web search και web fetch: διαθέσιμα.

# Chrome Web Store listing: Prophet (proposed copy)

Why this file exists: the live listing still reads "Your AI-powered assistant right in your browser"
and has about 143 users. The store listing is the conversion step for every page on
prophetchrome.com, so it is the highest-leverage asset to fix.

## Republishing is required (user step)

Nothing here goes live by merging code. The extension manifest change in
`apps/sidepanel/manifest.ts` (name and short description) only reaches the store when you:

1. Build the extension (`pnpm -F @prophet/sidepanel build`) and zip `apps/sidepanel/dist`.
2. Bump `version` in `apps/sidepanel/manifest.ts` if 1.0.2 was already uploaded (the store rejects a
   repeated version number).
3. Upload the zip in the Chrome Web Store developer dashboard and submit for review.
4. Paste the detailed description, screenshots and promo tile below into the Store listing tab
   (these live in the dashboard, not in the zip).

## Manifest fields (already changed in this branch)

| Field | Value | Notes |
|---|---|---|
| `name` | Prophet: AI Side Panel Agent | 28 characters. Brand first. No "Claude" in the title: it is a third-party trademark, and the store's keyword-spam policy flags titles stuffed with product names. |
| `description` | Works with Claude Haiku, Sonnet and Opus. Lives in your side panel, acts on the page you're on, and bills pay per use. | 118 characters (limit 132). Naming the models in the description is a factual compatibility statement, not a title trick. |

Policy references:
- https://developer.chrome.com/docs/webstore/program-policies/spam-faq
- https://developer.chrome.com/docs/webstore/best-listing

## Proposed detailed description

Paste this into the "Description" field. It is written as prose followed by a short feature list.
There is no keyword list at the end.

```
Prophet puts an AI agent in Chrome's side panel, next to the page you are working on. Ask a question
about the tab in front of you, or tell it to do something, and it reads the page and acts on it.

Most browser assistants only chat about a page. Prophet can also click, fill in forms, navigate,
and pull structured data out of pages. It reads each page as an accessibility tree (the same
structure screen readers use) rather than screenshots, so it sees real buttons, fields and labels.
That tends to be faster and cheaper than sending images to a model.

You choose the model per task. Prophet works with Anthropic's Claude Haiku for quick, cheap jobs,
Sonnet for everyday work, and Opus when a task needs deeper reasoning.

Pay per use, no subscription required. New accounts start with free credits, no card needed. After
that you pay for what you use, billed at the model provider's rate plus a platform margin, so you
can see what a task costs before you commit to a plan.

What you can do with it
- Summarize an article, thread or document without copying it into another tab
- Fill in long web forms from your own notes
- Compare products across several tabs and get the result as a table
- Review a pull request or read an unfamiliar repository on GitHub
- Draft replies from the email or message you have open
- Extract names, prices or dates from a page into clean structured text

Privacy and control
- Conversations are stored in your account so you can pick them up later
- The code is open source (Apache 2.0): https://github.com/ThanosKa/prophet
- Privacy policy: https://prophetchrome.com/privacy

Questions, bugs or ideas: https://github.com/ThanosKa/prophet/issues or https://prophetchrome.com/about
Pricing and how it works: https://prophetchrome.com/pricing and https://prophetchrome.com/how-it-works
```

Before pasting, check the privacy bullets against the product's actual behaviour and the store's
data-disclosure form. If any bullet is not literally true, delete it.

Keyword-density check on the block above (all at or under 5):
"Claude" 1, "side panel" 1, "AI" 1, "pay per use" 1, "browser" 1, "extension" 0, "page" 6 (a generic
word, not a target keyword). Re-count after any edit.

## Screenshot shot list (5 images, 1280x800, PNG or JPEG, no alpha)

Use a real signed-in account and real pages. Keep browser chrome visible and the side panel open.
Add one short caption bar (about 60 px, brand colour) at the top of each image; never fake UI.

1. **Side panel on a real article.** A long news or docs page on the left, the panel on the right
   with a summary already streamed. Caption: "Ask about the page you are on".
2. **An agent task mid-run.** A task such as "fill in this form from my notes" with the tool-call
   steps visible in the panel and the form half-filled. Caption: "It does things, not just chats".
3. **Model picker.** Panel showing Haiku, Sonnet and Opus with the cost shown for the current chat.
   Caption: "Pick the model per task".
4. **Pay-per-use credits.** The credits view with a real balance and a usage line.
   Caption: "Pay per use, no subscription".
5. **Structured extraction.** A product listing or search results page turned into a table in the
   panel. Caption: "Pull clean data out of any page".

Rules: no competitor logos, no price claims you have not verified today, no fake review stars, and
no text smaller than 24 px at 1280x800.

## Promo tile shot list

- **Small promo tile, 440x280 (required for featuring).** Prophet logo and name on a flat brand
  background, the line "AI agent in your side panel", and a cropped side-panel mock showing a
  completed task. Keep text under 20% of the area and legible at 220x140.
- Optional later: marquee tile 1400x560 with the same layout.
- Optional: a 30-60 second demo video on YouTube (the playbook rates one demo video above 30
  directories). Paste the URL in the "Global promo video" field.

## Category

Recommended: **Productivity** (the "Workflow & Planning" or "Tools" sub-category, whichever your
dashboard dropdown offers). Developer Tools is the wrong fit because most of the use cases are
general browsing. Confirm the exact sub-category names in the dashboard, since the store renames
them occasionally.

## Links to set in the listing

- Homepage URL: https://prophetchrome.com
- Support URL: https://github.com/ThanosKa/prophet/issues
- Privacy policy: https://prophetchrome.com/privacy
- GitHub repository: https://github.com/ThanosKa/prophet (mentioned in the description above)

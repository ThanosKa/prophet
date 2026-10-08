# 14 · Release dev to main and close every issue

Blocked by: 13 · Issues: #4-#17

The owner authorized the agent, on 2026-10-08, to merge into `main` without asking. Vercel deploys `main` to production on merge.

## What to build
1. **Pre-flight (read-only).**
   - Migrations 0006 and 0007 are applied in production.
   - The journal has 8 rows (ticket 02).
   - `dev` adds no migration after 0007.

   If any check fails, stop and tell the owner.
2. **Open the release PR** from `dev` to `main`, titled `release: pricing and credits, agent loop fixes`. Its body:
   - lists the changes;
   - has one line `Closes #4, closes #5, closes #6, closes #7, closes #8, closes #9, closes #10, closes #11, closes #12, closes #13, closes #14, closes #15, closes #16`;
   - notes that Vercel deploys on merge.
3. **Merge it** with a merge commit once its checks are green. Then fast-forward `dev` to `main`: `git push origin origin/main:dev`.
4. **Watch the deploy.** Wait until the Vercel production deploy is ready, then run read-only smoke checks:
   - the site responds;
   - `/api/agent/chat` without auth returns 401;
   - the production logs show no new errors for a few minutes.
5. **Build the extension.**
   - In a clean checkout of `main`, copy `apps/sidepanel/.env.production` from `C:\Users\thaka\Local\Cursor\prophet` without printing it.
   - Run `pnpm --filter @prophet/sidepanel build:prod`.
   - Check that `dist/manifest.json` has `"version": "1.0.7"`, and that the bundle contains `prophetchrome.com` and a `pk_live_` key, and contains neither `localhost` nor `/api/agent/chat/dev`.
   - Zip the *contents* of `dist` to `C:\Users\thaka\Desktop\prophet-1.0.7.zip`.
6. **Upload it.**
   - If the session has Claude in Chrome, load the `chrome-browser` skill and upload the zip in the Chrome Web Store developer dashboard, in a new tab of the owner's Chrome. Submit it for review.
   - If the session has no Claude in Chrome, tell the owner the zip is on the Desktop and ready to upload. This is the only step that can fall to the owner.
7. **Comment on every closed issue** in one short paragraph saying what shipped. Where the fix differs from what the issue suggested, say how and why:
   - #4: say whether installed 1.0.5 builds are covered (the legacy Turn-limit rule) or only 1.0.7.
   - #5: no `strict` and no min/max; the extension checks inputs instead.
   - #6: the Turn limit is 20, and there's no server-side Run counter, because every Turn is billed and rate-limited.
   - #8: size caps, but no signing of assistant Turns, because tool results are client-written anyway. 1.0.5 requests between 4.0 and 4.5 MB now get 413.
   - #12: a snapshot cap, a Run budget and a history window, instead of the beta context editing.
   - #13: `caller` is modelled as a field, instead of `.passthrough()` on whole blocks.
8. **Close #17** with a comment giving ticket 02's result.
9. **Optional, read-only:** run the #13 cache check on `usage_records` (do continuation Turns read the previous Turn's prompt from cache?) and add the numbers to #13's comment.
10. **Confirm the tracker is clean.** `gh issue list --state open` is empty, apart from anything new the owner opened.

## Acceptance criteria
- [ ] `main` is deployed and passes the smoke checks, and `dev` points at `main`.
- [ ] The 1.0.7 zip is built with the production config, and is uploaded or waiting on the Desktop.
- [ ] Issues #4-#17 are closed, each with a comment.

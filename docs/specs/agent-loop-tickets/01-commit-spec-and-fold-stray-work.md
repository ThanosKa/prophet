# 01 · Set up the worktree, commit the spec, fold stray work into PRs

Blocked by: - · Issues: -

## What to build
1. **Set up the worktree.**
   - In `C:\Users\thaka\Local\Cursor\prophet-agent-loop`, run `pnpm install`.
   - Copy `apps/marketing/.env.local`, `apps/sidepanel/.env.local` and `apps/sidepanel/.env.production` from `C:\Users\thaka\Local\Cursor\prophet` into the same paths in the worktree. They are gitignored. Never print them.
2. **Commit the spec.** On `fix/agent-loop`, commit `docs/specs/agent-loop-fixes.md` and `docs/specs/agent-loop-tickets/` as `docs: add agent loop fixes spec and tickets`. Push with an upstream.
3. **Move the four skill deletions into PR #18.**
   - The main checkout (`C:\Users\thaka\Local\Cursor\prophet`, branch `feat/haiku-5-5`) deletes four skills: `.claude/skills/open-source`, `qstash`, `skill-creator` and `workflow`. That deletion exists nowhere else, and the owner decided to keep it.
   - In the `prophet-dev` worktree (branch `docs/claude-md-restructure`, PR #18), delete the same four folders and check that nothing references them.
   - Commit as `docs(claude): remove unused skills` and push.
4. **Retarget PR #18** from `main` to `dev`: `gh pr edit 18 --base dev`.
5. **Check the main checkout's other uncommitted work.** Confirm it is already in a PR:
   - the 16 modified `.claude` files and `CLAUDE.md` match #18's branch;
   - `CODING_STANDARDS.md` matches #18's branch (use `--ignore-cr-at-eol`);
   - `GLOSSARY.md` matches #19's branch.

   Leave the main checkout as it is. Ticket 15 cleans it.
6. **Check the Chrome Web Store version.** Find the store listing URL in `apps/marketing/lib/constants.ts`, then fetch the public listing page and read its version.
   - If it is 1.0.5, the legacy Turn-limit rule in ticket 08 applies.
   - If it is 1.0.6, drop that rule, and say so in #4's closing comment.
   - Record the result in the ticket's commit message.

## Acceptance criteria
- [ ] `pnpm test:run` passes in the worktree.
- [ ] `fix/agent-loop` is on origin with the spec and tickets.
- [ ] PR #18 targets `dev` and includes the skill deletions.
- [ ] Every uncommitted file in the main checkout matches its PR branch.
- [ ] The store version is recorded.

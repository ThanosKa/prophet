# 13 · Agent-loop PR into dev

Blocked by: 02, 04-12 · Issues: -

## What to build
1. **Rebase.** If `dev` has moved, rebase `fix/agent-loop` on `origin/dev`.
2. **Check.** Run `pnpm test:run`, typecheck, lint and build for all three packages. Everything must pass.
3. **Review.** Review the diff against `CODING_STANDARDS.md` and the spec's user stories (`/code-review` against `origin/dev`). Fix what it finds.
4. **Remove the spec and tickets.**
   - Note the SHA of the current commit, which still has the tickets.
   - Delete `docs/specs/agent-loop-fixes.md` and `docs/specs/agent-loop-tickets/` in a final commit: `docs: remove implemented agent loop spec and tickets`.
5. **Open the PR** from `fix/agent-loop` into `dev`. Its body has:
   - a summary of the changes for each issue;
   - the line `Spec and tickets: <sha>`, so tickets 14 and 15 can be read with `git show <sha>:docs/specs/agent-loop-tickets/<file>`;
   - a note that GitHub doesn't close issues on merges into `dev`, so the release PR will.
6. **Merge.** Wait for green checks, then merge with a merge commit.

## Acceptance criteria
- [ ] The PR is merged into `dev`, with all checks green.
- [ ] The spec and tickets are in the history, absent from `dev`'s tree, and their SHA is in the PR body.

# 03 · Merge PR #19 and PR #18 into dev

Blocked by: 01 · Issues: -

## What to build
`dev` and `main` are both at 08e7430. Merging into `dev` doesn't deploy to production; only `main` does.

1. **Merge PR #19** (`feat/pricing-and-credits` into `dev`).
   - Check that its CI and checks are green.
   - Merge with a merge commit: `gh pr merge 19 --merge`.
2. **Merge PR #18** (`docs/claude-md-restructure`, now based on `dev`).
   - In the `prophet-dev` worktree, merge `origin/dev` into the branch.
   - Expect exactly one conflict, in `CLAUDE.md`: #19 rewrote the "SaaS Model" line, and #18 deletes that whole section. Take #18's version.
   - Run the tests, push, and merge PR #18 into `dev`.
3. **Rebase the agent-loop branch.** In the `prophet-agent-loop` worktree, rebase `fix/agent-loop` onto `origin/dev` and force-push with lease.

## Acceptance criteria
- [ ] PR #19 and PR #18 are merged into `dev`.
- [ ] `fix/agent-loop` sits on top of `origin/dev`, and `pnpm test:run` passes.

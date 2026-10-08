# 15 · Clean every worktree and branch

Blocked by: 14 · Issues: -

Run this ticket from a session whose working directory is `C:\Users\thaka\Local\Cursor\prophet`. Windows can't delete the folder a session runs in. If the session started inside a worktree, stop and ask the owner to restart it in the main checkout.

Before deleting a branch, check that it is merged into `origin/main` (`git log origin/main..<branch>` is empty), or that it is listed below as dropped by the owner.

## What to build
1. **Worktrees.** Remove each one with `git worktree remove`, run `git worktree prune`, and delete any leftover folder:
   - `C:\Users\thaka\Local\Cursor\prophet-agent-loop`;
   - `prophet-dev`;
   - `prophet-pricing`;
   - `prophet-seo`;
   - the scratch worktree `C:\Users\thaka\AppData\Local\Temp\claude\C--Users-thaka-Local-Cursor-prophet\a964c052-e60b-4644-b81e-a742a2a98996\scratchpad\pr19`. Remove it with `--force`; it holds three throwaway probe tests, which the owner decided to discard.
2. **Main checkout** (`C:\Users\thaka\Local\Cursor\prophet`).
   - Compare every uncommitted file with `origin/main`:
     - tracked files: `git diff --ignore-cr-at-eol origin/main -- <file>`;
     - `CODING_STANDARDS.md` and `GLOSSARY.md`: `git diff --no-index --ignore-cr-at-eol`.
   - If any file differs, stop and show the owner the diff.
   - Otherwise discard them: `git restore -- .`, then `git clean -f -- CODING_STANDARDS.md GLOSSARY.md`. Never run a bare `git clean -fd`.
   - Then `git switch main` and `git pull --ff-only`.
3. **Local branches to delete.**
   - These are merged into `origin/main`:
     - `feat/haiku-5-5`
     - `feat/pricing-and-credits`
     - `docs/claude-md-restructure`
     - `fix/agent-loop`
     - `seo-2026-10`
     - `feature/prompt-caching-cache-aware-billing`
     - `ref`
     - `worktree-agent-a119cfe1afa4681b4`
     - `worktree-agent-aab0366994c262c8e`
     - `worktree-agent-ac0900f053a6c807b`
   - `worktree-agent-ae10203497f6cc2b9` is not merged. The owner dropped it, so delete it with `-D`.
4. **Remote branches to delete:**
   - `feat/pricing-and-credits`
   - `docs/claude-md-restructure`
   - `fix/agent-loop`
   - `feature/prompt-caching-cache-aware-billing`
   - `fix/abuse-hardening`
   - `ref`
5. Run `git fetch --prune`.
6. **Memory note.** The project's Claude memory note `prod-migration-journal-drift` is now out of date. Tell the owner, so they can have it updated or removed.

## Acceptance criteria
- [ ] `git worktree list` shows only the main checkout.
- [ ] `git branch -a` shows only `main`, `origin/main`, `origin/dev` and `origin/HEAD`.
- [ ] The main checkout is on `main`, equal to `origin/main`, and `git status` is clean.
- [ ] No `prophet-*` sibling folders remain under `C:\Users\thaka\Local\Cursor\`.

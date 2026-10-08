# 02 · Fix the production migration journal

Blocked by: 01 · Issues: #17

## Background
- Production `drizzle.__drizzle_migrations` records only `0000_melodic_fallen_one`.
- Migrations 0001-0007 are all applied: 0001-0004 through `db:push`, and 0005-0007 by hand on 2026-10-05 and 2026-10-08.
- drizzle-orm 0.38.4 reads only the newest row's `created_at` and runs every journal entry with a later `when`. It never compares hashes.

## What to build
1. **Read the current state (read-only).** Run `SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;`.
   - Expect one row, with `created_at = 1766831781177`.
   - Compare its hash with the sha256 of `0000_*.sql` with LF endings and with CRLF endings, and use whichever variant matches. If neither matches, use LF (the git blob); drizzle never compares hashes.
2. **Check the schema (read-only).** Confirm that each migration's schema is present in production: columns, enum values, constraints, and the `credit_purchases` table and index. Derive each check from the migration's own SQL. If any check fails, stop and tell the owner.
3. **Write the script.** Put a small Node script in the scratchpad, outside the repo. It loads `dotenv` (with the absolute path to the worktree's `apps/marketing/.env.local`) and `postgres` through `createRequire` from `apps/marketing`. In one transaction it:
   - inserts 7 rows: `hash` = the sha256 of each `.sql` file in the chosen variant, `created_at` = that migration's journal `when`;
   - prints `count(*)` and `max(created_at)`;
   - commits.
4. **Run the script.** Claude Code asks the owner to allow the production write.
5. **Verify (read-only).** `count(*)` is 8, and `max(created_at)` is at least the largest `when` in `meta/_journal.json`. Only then run `pnpm --filter @prophet/marketing db:migrate`, again through the permission prompt. Its output must show nothing applied.
6. **Move the stray files.** `0001_rls_policies.sql` and `001-init.sql` aren't in the journal. Move them to `docs/db/legacy-sql/` and commit on `fix/agent-loop`.
7. **Update the docs.** In `.claude/docs/database-schema.md`, state that:
   - the journal is complete;
   - a new migration goes through `db:generate`, then `db:migrate` against production, before merging to `main`;
   - nobody runs `db:push` against production.
8. **Comment on #17** with the result. It is closed in ticket 14.

## Acceptance criteria
- [ ] The production journal has 8 rows, and `db:migrate` applied nothing.
- [ ] The stray files are moved and the docs are updated.
- [ ] #17 has the result comment.

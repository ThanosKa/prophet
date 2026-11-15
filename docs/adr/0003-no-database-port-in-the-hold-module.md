# 0003: No database port in the Hold module; tests use PGlite

Date: 2026-11-10

## Decision

The code that takes, settles and returns a Hold talks to the database directly, through Drizzle. It does not sit behind an interface (a "port") with an in-memory fake. Its tests run against PGlite, a real Postgres engine that runs in the test process.

## Why

The Hold's rules live in the SQL: atomic balance changes, which Credits are spent first, and returning the unused part. A fake would reimplement those rules and could pass while the real queries are wrong. PGlite runs the real queries, so the tests check what production runs.

## Cost

Tests are slower than against a fake, and they depend on PGlite staying close enough to the production Postgres.

## Rejected alternative

A database port with a hand-written in-memory adapter. It adds a layer and a second implementation of the billing rules to keep in step, and it would not catch a wrong query.

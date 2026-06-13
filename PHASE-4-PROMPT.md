# Phase 4 — Full-text search (execution prompt)

Scope-locked execution prompt for ROADMAP Phase 4, same build principles as
Phases 2–3. Stay on this script. This phase has a schema migration and folds in
GitHub issue #1 (the `pg_trgm` GIN indexes that an earlier migration dropped).

## Context

Search today (`src/repositories/book.repository.ts`) is `title ILIKE '%term%' OR
EXISTS(author ILIKE '%term%')` — a leading-wildcard scan that (per issue #1) has
no usable index since the trigram GINs were dropped. It can't stem ("run" won't
find "running"), can't rank by relevance, and is a full seq scan. Replace it with
Postgres full-text search, and resolve #1 deliberately.

## Mission

Make search **FTS-backed with relevance ranking**, and add **trigram back as a
typo-tolerant fallback** — a hybrid that directly demonstrates the FTS-vs-trigram
tradeoff. One migration; the search query and seed change.

## Hard rules (same as Phases 2–3 — non-negotiable)

1. **Raw SQL** for the search query (`$queryRaw`, every value a bind param).
2. **No shortcut libraries.** No search service, no ORM full-text helper. Build
   the `tsvector`/`tsquery`/`ts_rank` yourself.
3. **Produce the numbers yourself.** `EXPLAIN (ANALYZE, BUFFERS)` BEFORE (ILIKE
   seq scan) and AFTER (GIN index scan) on the committed bench dataset; show the
   plan flip and the row/buffer counts. Seed enough rows that the planner really
   prefers the index.
4. **Tradeoff before you pick** — generated column vs trigger; FTS vs trigram vs
   hybrid; weighting and config choice — with the rejected option's failure mode.
5. **Update `LEARNING.md`** (new §13; refresh §3) in the existing voice; it must
   answer the roadmap's "Done when you can answer" question with your numbers.
6. **Keep the deploy green.** Migration must `prisma migrate deploy` cleanly;
   the search UI must keep working throughout.

## Locked design decisions (do NOT redesign mid-flight)

- **Stored generated `tsvector` column on `books`, English config, weighted:**
  `setweight(to_tsvector('english', title), 'A') ||
   setweight(to_tsvector('english', coalesce(authors_text,'')), 'B') ||
   setweight(to_tsvector('english', coalesce(description,'')), 'C')`.
  A `GENERATED ALWAYS AS (...) STORED` column stays in sync automatically and
  needs no trigger — but it can only reference SAME-ROW columns.
- **Author names reach the row via a denormalized `authors_text` column.** A
  generated tsvector can't join to `authors`/`book_authors`, so concatenate the
  author names into a plain `authors_text` column on `books`. It's written where
  authorship is set (the seed) — books/authors have no user-edit path, so there's
  no hot write path to maintain. This IS the "generated column vs trigger"
  decision: we denormalize one column so the generated column suffices, instead
  of a multi-table trigger. Backfill it in the migration.
- **Query:** `websearch_to_tsquery('english', $term)` for natural input
  (quotes, OR, -negation). Rank with `ts_rank(search_vector, query)` DESC, then
  `rating_count` as a tiebreaker. Keep the existing display columns/shape.
- **Prefix matching for autocomplete:** when the input has no FTS operators,
  also OR-in a prefix query built from the trailing token (`token:*` via
  `to_tsquery`) so "dun" matches "Dune" before the user finishes typing.
- **Trigram is RECREATED, as a hybrid fallback (this closes issue #1).** Add a
  migration that `CREATE EXTENSION IF NOT EXISTS pg_trgm` and recreates GIN
  `gin_trgm_ops` indexes on `books.title` and `books.authors_text`. Use trigram
  ONLY when FTS returns zero rows (typo tolerance: "runing" → "running" via
  `similarity`), so the common path is pure FTS. Declare the indexes in
  `schema.prisma` (or document them migration-managed) so a future diff can't
  silently drop them again.
- **Config is `'english'` everywhere**, hard-coded in SQL. Multilingual is out
  of scope; name it as such.

## Acceptance gates ("Done when you can answer")

- Show BEFORE (ILIKE Seq Scan) vs AFTER (Bitmap Index Scan on the FTS GIN) plans
  with numbers.
- Explain in `LEARNING.md` why FTS finds "running" for "run" (stemming) but not
  "runing" (not a stem), and why trigram does the reverse (character n-grams,
  not language) — and how the hybrid gives you both.
- Search still works end-to-end (page + API); relevance ordering is visibly
  better than the old `rating_count`-only order; a typo'd query returns results
  via the trigram fallback.

## Per-phase loop

1. Tradeoff writeup.
2. Migration: `authors_text` (+ backfill), generated `search_vector`, GIN index,
   recreate trigram GINs (issue #1); declare indexes in schema.
3. Implement the FTS query + prefix + trigram fallback in `book.repository`;
   maintain `authors_text` in the seed.
4. Bench: throwaway PG, migrate, seed + `bench-seed.sql`, capture BEFORE/AFTER
   `EXPLAIN`; verify stemming, prefix, and typo-fallback behavior with real queries.
5. `LEARNING.md` §13 + refresh §3; build + lint.
6. Open a PR (do NOT fast-forward to main): push the branch, `gh pr create`.
7. Code-review the PR diff; fix anything real; merge per the review.
8. Apply the migration to Neon (`prisma migrate deploy`, direct endpoint), then
   confirm the deploy and smoke-test live search. Stop and report.

Begin by reading `book.repository.ts`, the search page + `SearchForm`, the
relevant bits of `schema.prisma`, and the seed's author handling — then write the
tradeoff section before touching code.

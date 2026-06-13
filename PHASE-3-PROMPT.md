# Phase 3 — Feed ranking (execution prompt)

Scope-locked execution prompt for ROADMAP Phase 3. Same build principles as
Phase 2 (denormalized counters). Stay on this script — the design decisions are
pre-made below specifically to prevent scope drift.

## Context

Leaflet's feed (`src/repositories/feed.repository.ts` — THE query of the
codebase) is currently **pure chronological**: a UNION ALL of reviews + shelvings
by people you follow, keyset-paginated on `(created_at, item_id)` so the ORDER BY
is served straight off the index with no Sort node. Phase 2 added
`reviews.like_count` (a maintained column) — engagement is now a cheap scalar
read, which is the prerequisite that makes ranking affordable.

## Mission

Ship **v2 of the feed: an engagement-vs-recency ranked mode**, with the existing
chronological mode kept as a **toggle**. One query change, no schema migration.

## Hard rules (same as Phase 2 — non-negotiable)

1. **Raw SQL** for the feed query. Tagged-template `$queryRaw` / `Prisma.sql`
   only; every user value a bind param. No `$queryRawUnsafe`.
2. **No shortcut libraries.** Build the scoring + pagination yourself. No feed/
   ranking packages.
3. **Produce the numbers yourself.** Ship real `EXPLAIN (ANALYZE, BUFFERS)` for
   BOTH modes on the committed bench dataset (`prisma/bench-seed.sql`), and show
   the structural difference (index-ordered keyset vs compute-then-Sort). Seed
   enough rows that the plan is real.
4. **Tradeoff before you pick** — write the competing options and why, with the
   rejected option's failure mode named.
5. **Update `LEARNING.md`** (new §12) in the existing voice; it must answer the
   roadmap's "Done when you can answer" question with your numbers.
6. **Keep the deploy green.** No migration this phase. Default mode stays
   chronological so existing clients are unaffected. Build + lint clean.

## Locked design decisions (do NOT redesign these mid-flight)

- **Scoring formula (HN-style time decay):**
  `score = (like_count + 1) / pow(age_hours + 2, gravity)`, `gravity = 1.8`.
  - `+1` smoothing so zero-like items (and ALL shelvings, which have no review)
    still rank by recency instead of collapsing to 0. `+2` on age so brand-new
    items don't divide by ~0 and spike. These are HN's constants; cite that.
  - Shelvings carry `like_count = 0`, so they rank on pure recency decay —
    acceptable; ranking reviews above equally-recent shelvings is the intent.
- **Pagination = frozen-clock snapshot in the cursor.** The ranked cursor is
  `(snapshotAtMs, score, itemId)`. `snapshotAtMs` is captured once on the first
  page (no cursor) and threaded through every subsequent page, so `age_hours` is
  computed against a FIXED instant for the whole scroll. Keyset stays
  `WHERE (score, item_id) < (cursorScore, cursorId)` with `ORDER BY score DESC,
  item_id DESC` — but `score` is a COMPUTED expression (no index), so the plan
  will Sort. That is the point of the lesson, not a bug to optimize away.
- **Toggle = `?sort=` on `/api/feed`.** `sort=new` (default, current behavior)
  or `sort=top`. The two modes use DIFFERENT cursor shapes; encode the mode so a
  cursor can't be replayed against the wrong mode. Keep the chronological path
  exactly as-is.
- **Residual instability is DOCUMENTED, not fixed here.** Freezing the clock
  removes the time-decay cause of cross-page duplicates/skips. `like_count` can
  still change mid-scroll and move an item across a page boundary — that is
  precisely the "appears on two consecutive pages" answer. The full fix
  (materialized ranked snapshot / score buckets / fan-out-on-write) is named as
  Phase-3.5+ scope, NOT built now.

## Acceptance gates ("Done when you can answer")

- Show the ranked query's `EXPLAIN ANALYZE` plan and explain its Sort. (Measured
  reality: BOTH modes top-N heapsort on this schema; the honest distinction is
  that the chronological key is index-improvable while the computed score is
  never indexable. Report what the plan actually shows, not the assumption.)
- Explain, in `LEARNING.md`, exactly why an item can appear on two consecutive
  pages once scores change mid-scroll — and what the frozen-clock snapshot does
  and does not prevent.
- Both modes return correct, stable pages on the bench data; `sort=top` puts
  highly-liked recent reviews above old or unliked items; `sort=new` is byte-for-
  byte the old behavior.

## Per-phase loop

1. Tradeoff writeup (formula choice; snapshot vs score-bucket vs naive).
2. Implement: ranked branch in `feed.repository.ts`, mode + cursor in
   `feed.service.ts`/`feed-types.ts`, `?sort=` in the API route, a toggle in the
   feed UI.
3. Bench: stand up throwaway Postgres, migrate, seed + `bench-seed.sql`, capture
   `EXPLAIN ANALYZE` for both modes; verify page stability (no dup/skip across
   pages under a frozen clock).
4. `LEARNING.md` §12 with the numbers and the two-page answer.
5. Build + lint; commit with a message that explains the decision; push to deploy
   (no migration). Stop and report the numbers.

Begin by reading `feed.repository.ts`, `feed.service.ts`, `feed-types.ts`, the
`/api/feed` route, and the feed UI (`FeedList`/`FeedCard`/feed page), then write
the tradeoff section before touching code.

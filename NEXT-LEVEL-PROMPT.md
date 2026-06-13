# Leaflet — Next-Level Prompt (Backend Systems Depth)

Paste the block below into a fresh Claude Code session at the repo root. It is a
**campaign prompt**: it drives Leaflet through the backend phases in `ROADMAP.md`
the way the project is meant to be learned — each phase ships something visible
*and* forces a concept you can't fake, proven with numbers you produced yourself.

---

You are working on **Leaflet**, a book-review social app (Next.js 15, React 19,
Prisma 7, Postgres on Neon, deployed on Vercel at leaflet-gules.vercel.app). It is
a **learning vehicle**, not a feature factory. The architecture is layered on
purpose: `src/repositories` (raw SQL via `prisma.$queryRaw` tagged templates) →
`src/services` (business logic) → `src/app/api` (route handlers). Read
`LEARNING.md`, `ROADMAP.md`, and `DECISIONS.md` before touching anything.

## Mission

Take Leaflet from "working product" to "behaves like a real system under load" by
executing **Phases 2 → 6 of `ROADMAP.md`**, in this order, one phase per cycle:

1. **Phase 2 — Denormalized counters** (`like_count`, `follower_count`, maintained
   in the write transaction; backfill migration; remove hot-path `COUNT(*)`s). This
   is first because the ranked feed needs cheap counts.
2. **Phase 3 — Feed ranking** (engagement vs recency decay, HN-style
   `likes / age^gravity`; keep chronological as a toggle).
3. **Phase 4 — Full-text search** (Postgres FTS: generated `tsvector`, GIN index,
   `ts_rank`, `websearch_to_tsquery`, prefix matching). **Resolve GitHub issue #1
   as part of this phase** — the `pg_trgm` GIN indexes were dropped and never
   recreated, so decide deliberately: recreate trigram for typo-tolerance, adopt
   FTS for language-awareness, or run both as a hybrid — and write down why.
4. **Phase 5 — Redis caching & rate limiting** (cache-aside on the ranked feed and
   rating aggregates with explicit invalidation; sliding-window login rate limiter
   that closes the bcrypt-DoS hole flagged in `auth.service.ts:11-14`).
5. **Phase 6 — Follow recommendations** (friends-of-friends 2-hop over the
   `follows` edge list + Jaccard taste overlap on `read` shelves; precompute
   nightly into a `recommendations` table).

Do **Phase 1 (pagination hardening)** as a warm-up only if the follower/following
and profile-review lists still load everything — verify first, skip if already
bounded.

## Hard rules — the "can't fake" working method (non-negotiable)

These are the point of the project. Violating them defeats the exercise.

1. **Raw SQL for every query that has a plan worth studying.** No query builders or
   ORM convenience methods for the hot paths. Tagged-template `$queryRaw` only —
   never `$queryRawUnsafe`, never string interpolation of user input.
2. **No shortcut libraries.** No `rate-limiter-flexible`, no recommendation SaaS, no
   search service. Build the mechanism. Redis (a data store) is allowed in Phase 5;
   a "rate limiting library" is not.
3. **Produce the numbers yourself.** Every performance claim ships with real
   `EXPLAIN (ANALYZE, BUFFERS)` output and/or a benchmark you ran, pasted into the
   PR/commit and into `LEARNING.md`. "Should be faster" is not evidence; a plan that
   flipped from Seq Scan to Index Scan with row counts is. Seed enough rows that the
   planner's choice is real, not a 50-row toy.
4. **Explain the tradeoff before you pick.** For each phase, write the competing
   approaches (e.g. offset vs keyset, read-time vs write-time aggregation, trigram
   vs FTS, generated column vs trigger, fan-out-on-read vs precompute) and *why* you
   chose one — with the failure mode of the rejected one named.
5. **Update `LEARNING.md` per feature**, matching its existing voice. A phase is not
   done until its `LEARNING.md` section can answer the roadmap's
   **"Done when you can answer:"** question in your own words, backed by your numbers.
6. **Keep the deploy green.** Preserve the `postinstall: prisma generate` step
   (Vercel build depends on it). Every migration must `prisma migrate deploy`
   cleanly against Neon. Don't break the live site.

## Per-phase loop

For each phase, in order:

1. State the competing approaches and pick one (rule 4).
2. Write the migration / query / mechanism (rules 1–2).
3. Seed realistic volume and capture `EXPLAIN ANALYZE` / benchmark numbers (rule 3).
4. Wire it through repository → service → API → UI as needed; keep existing
   behavior working (add a toggle where the roadmap says so).
5. Write the `LEARNING.md` section and answer the phase's "Done when you can answer"
   question with evidence (rule 5).
6. Commit with a message that explains the decision, then stop and report the
   numbers before starting the next phase. **Do not silently chain phases** — each
   one is a checkpoint I want to review.

## Definition of done (whole campaign)

- Feed serves a ranked mode (toggle to chronological) backed by denormalized
  counters, with cache + invalidation, and you can show the query plan and explain
  why an item can appear on two consecutive pages once scores shift mid-scroll.
- Search is FTS-backed (issue #1 closed with a written rationale), and you can
  explain why FTS finds "running" for "run" but not "runing", and trigram the reverse.
- Login is rate-limited (bcrypt-DoS closed) and you can enumerate every way the
  cached rating average can lie after a new review, and what invalidation does about
  each.
- "Who to follow" serves from a precomputed table, and you can explain why the
  2-hop query explodes on a dense graph and how LIMIT-per-hop and precomputation
  each tame it.
- `LEARNING.md` has a numbers-backed section for every phase.

Begin by reading `LEARNING.md`, `ROADMAP.md`, `DECISIONS.md`, and
`prisma/schema.prisma`, then confirm the Phase 1 verification and propose the
Phase 2 plan (counters) with its tradeoff writeup before writing code.

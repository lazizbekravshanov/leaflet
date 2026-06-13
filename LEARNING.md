# LEARNING.md

A log of what each feature is supposed to teach. For every feature: the data
structures and system design concepts it touches, where to look in the code,
and one question you should be able to answer after building it. If you can't
answer the question, the feature isn't done — reread the code comments.

---

## 1. The schema (prisma/schema.prisma)

**Concepts**
- B-tree indexes: what they can serve (equality, range, leftmost-prefix of a
  composite, ORDER BY in index order) and what they can't (`ILIKE '%x%'`).
- Composite primary keys on join tables vs surrogate ids.
- Normalization: why `Rating` is its own table, why `Author` isn't a column.
- Foreign keys + `ON DELETE CASCADE` as invariant enforcement; the fact that
  Postgres does NOT auto-index the FK side.
- Partial unique indexes (`shelves_one_system_shelf_per_type`) and CHECK
  constraints — things the ORM can't express, written as raw migration SQL.
- Adjacency list: `Follow` is a directed graph stored as edge rows.

**Question:** The book page runs `WHERE book_id = ? ORDER BY created_at DESC`.
Why does the index `(book_id, created_at DESC)` avoid a sort step, and why
would two separate indexes on `book_id` and `created_at` not?

## 2. Sessions & auth (src/services/auth.service.ts, src/lib/auth.ts, src/lib/csrf.ts)

**Concepts**
- Server-side sessions vs JWTs: revocability is the trade.
- Why session tokens are hashed with SHA-256 but passwords with bcrypt —
  entropy decides which hash you need (fast one-way vs deliberately slow).
- Cookie flags: `httpOnly` (XSS can't read), `secure` (no plaintext wire),
  `SameSite=Lax` (CSRF layer 1), expiry as a hint vs the DB as the authority.
- CSRF: why SameSite alone is almost enough, what the Origin check adds.
- Session fixation → rotation on login.
- User enumeration → one generic error + dummy bcrypt compare for timing.
- TOCTOU: why signup catches the unique-violation instead of SELECT-then-INSERT.

**Question:** An attacker steals a full dump of the `sessions` table (not the
cookies). Can they log in as anyone? Walk through exactly what stops them.

## 3. Search (src/repositories/book.repository.ts, the migration's trgm index)

**Concepts**
- Parameterized queries: why `$queryRaw` tagged templates are injection-safe.
- Trigram (pg_trgm) GIN indexes: substring search as an inverted index over
  3-grams; why B-trees can't do leading wildcards.
- Query planner behavior: seq scan beats index scan on tiny tables; plans
  change as data grows. `EXPLAIN ANALYZE` is the tool, not guesswork.
- Correlated scalar subqueries vs JOIN+GROUP BY — same result, different
  plans, different scaling.
- Type mapping at the driver boundary (bigint → BigInt, numeric → string,
  and the `::int` / `::float8` casts that sidestep it).

**Try it** (after `docker compose up -d` and seeding):
```sql
EXPLAIN ANALYZE SELECT * FROM books WHERE title ILIKE '%dune%';
-- then: DROP INDEX books_title_trgm;  and run it again. Put the index back.
```

**Question:** Why does the planner ignore `books_title_trgm` at 50 rows, and
what (roughly) makes it flip to a bitmap index scan as the table grows?

## 4. Shelves (src/services/shelf.service.ts, src/repositories/shelf.repository.ts)

**Concepts**
- Transactions for cross-row invariants: "a book is on at most one system
  shelf" cannot be a constraint, so it's a delete+upsert in one transaction.
- Idempotency: re-shelving is an upsert keyed on the composite PK, so
  double-clicks and retries are harmless.
- Where invariants live: schema constraint > transaction in code > hope.
- The modeling fork: unified Shelf/ShelfItem (chosen) vs a `status` column on
  a UserBook row — what each makes easy and hard.

**Question:** If two requests race to shelve the same book onto READING and
READ, what are the possible end states, and why is "on both shelves" not one
of them?

## 5. Reviews & ratings (src/services/review.service.ts, src/repositories/review.repository.ts)

**Concepts**
- Upsert as edit semantics under `UNIQUE (user_id, book_id)`.
- Multi-table writes in one transaction (review + rating land together).
- Aggregates on a narrow table: `AVG` over `ratings`, not over review rows.
- Two-query merge in JS (reviews + their authors' ratings via a Map) vs a raw
  SQL join — both are on display; know the cost of each.
- Defense in depth: rating range checked in the service AND by a CHECK
  constraint.

**Question:** The review list does 2 queries and a `Map` merge. At what point
does this become an N+1 problem, and why isn't it one here?

## 6. Auth UI & the layered architecture (src/app, src/components, src/services, src/repositories)

**Concepts**
- Dependency direction: app → services → repositories → Prisma. Services
  never import `next/*` — that's the seam where the API layer could be
  extracted into a standalone service.
- Errors as types: services throw `ConflictError`; exactly one place
  (src/lib/api.ts) turns that into a 409.
- Server components read the session on the server (no auth flash); client
  components exist only where there's interactivity (forms, buttons).
- `router.refresh()` as the cache-invalidation handshake between client
  mutations and server-rendered UI.

**Question:** To expose the exact same signup/login/shelve/review API from a
standalone Express service tomorrow, which files move, which get rewritten,
and which are untouched? (If the answer isn't "routes get rewritten, services
and repositories move, UI is untouched", the layering leaked.)

## 7. The feed (src/repositories/feed.repository.ts — THE query of this codebase)

**Concepts**
- Fan-out-on-read vs fan-out-on-write: we JOIN through `follows` at read time;
  Twitter precomputes per-follower feed rows at write time. Know why each
  side wins and where the celebrity problem breaks read-time fan-out.
- Keyset (cursor) pagination vs OFFSET: `WHERE (at, item_id) < (cursor)`
  seeks via index and is stable under concurrent inserts; OFFSET re-reads and
  discards rows and shifts under your feet. The cursor must be the FULL
  ORDER BY key (timestamp alone isn't unique — ties need the id tiebreaker).
- Opaque cursors: base64url of the sort key, validated on decode.
- `UNION ALL` (no dedup sort) to merge heterogeneous activity sources.
- Row-comparison semantics: `(a,b) < (x,y)` is lexicographic, matching
  `ORDER BY a DESC, b DESC` exactly.

**Try it**:
```sql
EXPLAIN ANALYZE
SELECT r.* FROM reviews r
 WHERE r.user_id IN (SELECT followee_id FROM follows WHERE follower_id = '<id>')
 ORDER BY r.created_at DESC LIMIT 10;
```

**Question:** A new review lands between your page-1 and page-2 requests.
Explain precisely why cursor pagination shows no duplicate/skip, and why
OFFSET pagination would.

## 8. Likes & comments (src/services/engagement.service.ts, LikeButton.tsx)

**Concepts**
- Optimistic UI: flip state locally, reconcile with the server's
  authoritative count, roll back on failure.
- Idempotency end-to-end: POST/DELETE pair + `skipDuplicates` on a composite
  PK = retries and double-clicks are safe (HTTP semantics meet DB
  constraints).
- Ownership checks live in the service (403 vs 404 — and what each leaks).
- Batched child loading: comments for 20 reviews in ONE `IN` query — the
  N+1 problem and its standard fix.

**Question:** The like count shown after your optimistic update can differ
from the count the server returns. Why, and which one should win?

## 9. The social graph (Follow, profiles, /people, middleware)

**Concepts**
- Directed graph as an edge list; the PK serves "who do I follow" (feed hot
  path), the secondary index serves "who follows me" (counts).
- Why middleware only checks cookie PRESENCE (Edge runtime, no DB) and the
  real check stays server-side — defense in depth, not duplication.
- `_count` correlated subqueries on the people directory; the denormalized
  counter alternative is the Phase 2 exercise.

**Question:** Why is the follower-count query `COUNT(*) WHERE followee_id=?`
served index-only, and what changes (storage, write path, failure modes) if
you denormalize it into `users.follower_count`?

## 10. Seeding & external data (prisma/fetch-books.ts, prisma/seed.ts)

**Concepts**
- ETL separation: fetch (network, flaky, run once) is a different program
  from load (deterministic, idempotent, run anywhere).
- Idempotent loads via upsert on a natural key (the Open Library id).
- Why the snapshot is committed: deterministic seeds, offline CI.

**Question:** If you run `npm run db:seed` five times, how many rows are in
`books` and `book_authors`, and which schema features guarantee that?

## 11. Denormalized counters — Phase 2 (reviews.like_count, users.follower_count / following_count)

The shift from **read-time aggregation** (compute `COUNT(*)` every time you
display a count) to **write-time maintenance** (store the count, adjust it ±1 on
every write). The count stops being derived and becomes cached state — which
means it can now be *wrong*, so the whole lesson is keeping it honest.

**Concepts**
- Read-time vs write-time aggregation: who pays, and when. The `COUNT(*)`
  version is always correct but pays on every read; the column is one cheap read
  but pays a maintenance cost (and a correctness risk) on every write.
- Atomic maintenance in ONE statement. Both `likeRepository.like` and
  `followRepository.follow` do the row write and the counter bump in a single
  SQL statement (a CTE) — one implicit transaction. A reader can never see the
  like row without the +1, and a crash can't apply one without the other.
- Idempotency that the counter respects. `INSERT … ON CONFLICT DO NOTHING`
  makes a double-click a no-op; the counter delta is `(SELECT COUNT(*) FROM ins)`
  — literally the number of rows the write produced, 0 or 1. The classic bug is
  `ON CONFLICT DO NOTHING` followed by an unconditional `SET n = n + 1`, which
  inflates on every re-click.
- Atomic increment vs read-modify-write race. `SET like_count = like_count + 1`
  is evaluated by Postgres under the row's write lock, so concurrent likes
  serialize and none is lost. Reading the count into the app and writing back
  `count + 1` is a lost-update bug under concurrency.
- One write, two counters. A single follow edge updates the follower's
  `following_count` AND the followee's `follower_count` — `UPDATE users … WHERE
  id IN (a, b)` with a per-row `CASE` routes the delta. Same-plan locking order
  on both follow and unfollow avoids deadlock.
- Backfill + reconcile as a recurring chore. The migration backfills from the
  source rows (`UPDATE … FROM (SELECT … GROUP BY)`); a reconciliation query
  re-derives the truth and finds drift:
  ```sql
  SELECT r.id FROM reviews r
   WHERE r.like_count <> (SELECT COUNT(*) FROM likes l WHERE l.review_id = r.id);
  ```
  The `likes`/`follows` rows are the source of truth; the counter is a cache. On
  disagreement, the rows win — re-run the backfill to converge.

**Numbers** (bench: 2,008 users · 60k follows · 30k reviews · 434k likes;
`prisma/bench-seed.sql` reproduces it; A/B of the same feed query on the same
data, like_count via subquery vs column):
- Feed query, `EXPLAIN (ANALYZE, BUFFERS)` for a user following 30 people
  (~450 candidate rows → `LIMIT 11`):
  - BEFORE: the `like_count` `COUNT(*)` ran as a per-result-row **SubPlan
    Aggregate** (`loops=11`) over an Index Only Scan on `likes`, with
    **Heap Fetches: 151**. Execution-time median ≈ **5.0 ms**.
  - AFTER: that SubPlan is **gone** — `like_count` rides along on the reviews
    row already being read; no heap fetches for it. Median ≈ **4.4 ms**
    (~10–12% on this query).
  - Honest caveat: the win is modest because the feed's dominant cost is the
    *activity* materialization (a Seq Scan over all 30k reviews for the
    follow semi-join + the ratings hash), NOT the counter subquery. The
    denormalization's payoff scales with page size and likes-per-review, and
    that Seq Scan is a separate indexing concern (Phase 3 territory).
- Profile follower/following: BEFORE two index-only `COUNT(*)` scans over
  `follows`; AFTER a single `users_pkey` Index Scan returning both columns
  (~0.05 ms). The structural win — counter cost is independent of how many
  followers you have — matters more than the microseconds at this scale.

**Question:** When a `like` row and `reviews.like_count` disagree, which is the
truth, and what keeps them converging? (And: name the exact one-line change to
the like statement that would silently inflate the counter on every double-click.)

## 12. Feed ranking — Phase 3 (sort=top: engagement vs recency)

A second feed mode that orders by a score instead of by time, with the
chronological feed kept as a toggle (`?sort=new|top`). Phase 2's
`reviews.like_count` is the input that makes this cheap — engagement is a column
read, not an aggregate. No schema change; this is a pure query phase.

**Concepts**
- Scoring function (Hacker News shape):
  `score = (like_count + 1) / (age_hours + 2) ^ 1.8`. The `+1` keeps zero-like
  items (and every shelving, which has no review) ranking by recency instead of
  collapsing to 0; the `+2` stops brand-new items dividing by ~0; `1.8` is the
  decay gravity. Tunable knobs with intuitive effects: raise gravity → recency
  dominates; raise the vote smoothing → likes matter less for new items.
- Ranking forfeits the index. A keyset on `(created_at, id)` can in principle be
  served sortless (MergeAppend over per-source indexes). A keyset on a
  `now()`-dependent COMPUTED score can NEVER be indexed — the query must compute
  the score for every candidate and Sort. Measured: both modes top-N heapsort
  today, but ranked also pays a `power()` per candidate + a second sort.
- Keyset pagination under ranking is unstable, and the fix is a frozen clock.
  Two things move scores between page requests: (a) time passes (age grows), and
  (b) likes change. We kill (a) by snapshotting the scoring instant on page 1 and
  threading it through the cursor (`["top", snapshotAtMs, score, itemId]`), so
  age is measured from one fixed moment for the whole scroll. (b) is left live
  and is the documented residual.
- Why an item can appear on two consecutive pages (the roadmap question,
  reproduced live): page 1 returns items 1–10 and hands page 2 the cursor
  `(score@10, id@10)`. Page 2 asks for `(score, id) < cursor`. If an item that
  was on page 1 (say rank 9) loses a few likes between the two requests, its
  live score drops just below the frozen cursor — so it now satisfies the page-2
  predicate and is served AGAIN. (The dual: an item just below the cursor that
  GAINS likes jumps above it and is skipped entirely.) The frozen clock prevents
  the time-decay version of this; only a materialized ranked snapshot / score
  buckets / fan-out-on-write removes the like-mutation version — that's deferred,
  not built here.
- Cursors are mode-tagged. `new` and `top` cursors carry different keys, so the
  first array element is the mode; a cursor minted in one mode is rejected
  against the other instead of being silently miscompared.

**Numbers** (bench: same 2,008-user / 434k-like set; `bu_1` follows 30 people →
~450 candidate rows → `LIMIT 11`; A/B `EXPLAIN (ANALYZE, BUFFERS)`, medians of 5):
- `sort=new`: ~**3.5 ms**. Top-N heapsort on `(at, id)` over a Seq Scan of the
  followee reviews.
- `sort=top`: ~**8.4 ms** (~**2.4x**). Same Seq Scan, but a top-N heapsort keyed
  on the full `power()` score expression (`Sort Key: ((like_count+1)/power(...))`),
  then a second sort of the joined page. The cost is the price of ranking: a
  transcendental per candidate and an unindexable key.
- Pagination correctness, verified on the bench set:
  - Frozen clock, nothing changes → page-2 keyset matches ground-truth rows
    11–20 exactly, **0 overlap** with page 1 (no dup, no skip).
  - Like-count change mid-scroll → the rank-9 item, after losing 3 likes,
    reappears at **position 1 of page 2** — a reproduced duplicate.

**Gotchas found (both real, both caught before deploy):**
- The score expression is `numeric` (extract/power return numeric), and
  node-postgres hands `numeric` back as a STRING. That string went into the
  cursor, and the keyset comparison silently failed — page 1 returned items with
  a `nextCursor`, but page 2 came back empty. Fix: `::float8` on the score, so it
  crosses the driver boundary as a JS number and round-trips losslessly. This is
  the exact "casts matter at the driver boundary" note from `book.repository`,
  but load-bearing for correctness here, not just for clean numbers.
- `prisma/bench-seed.sql` bulk-inserts likes but originally never reconciled
  `reviews.like_count`, so the ranked feed first ran on all-zero engagement
  (pure recency). Same bulk-bypass lesson as the seed — fixed by adding the
  reconcile UPDATE to the bench script.

**Question:** You raise the gravity from 1.8 to 3.0. Describe what happens to the
feed's first page, and to how fast a highly-liked old review falls off it. Then:
the frozen-clock snapshot makes age stable across a scroll — why does that NOT
make the ranked feed fully stable, and what kind of store would?

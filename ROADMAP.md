# Roadmap

Six phases, ordered by learning value. Each phase ships something visible AND
forces a concept you can't fake.

**Already built** (the working product): schema + migrations, session auth,
trigram search, shelves, reviews & ratings, likes, comments, follow graph,
profiles, people directory, and the chronological home feed (raw SQL, keyset
pagination). See LEARNING.md for what each piece teaches.

## Phase 1 — Pagination & list hardening
**Build:** paginate the follower/following lists and profile review lists
(they currently load everything); add an OFFSET version first, measure, then
convert to keyset like the feed.
**Learn:** offset vs cursor with EXPLAIN numbers you produced yourself; when
offset is actually fine (small bounded lists, admin pages).
**Done when you can answer:** why does `OFFSET 10000 LIMIT 20` get slower the
deeper you page, while `WHERE (created_at, id) < (?, ?)` doesn't?

## Phase 2 — Denormalized counters
**Build:** `like_count` on reviews and `follower_count` on users, maintained
in the same transaction as the like/follow write; backfill migration; remove
the hot-path `COUNT(*)`s (feed query, people page).
**Learn:** read-time aggregation vs write-time maintenance; atomic
`UPDATE ... SET n = n + 1` vs read-modify-write races; backfill + verify
(`SELECT ... HAVING count mismatch`) as a recurring real-world chore.
**Done when you can answer:** when a like row and the counter disagree, which
is the truth, and what keeps them converging?

## Phase 3 — Feed ranking
**Build:** v2 of the feed: score items by engagement vs recency decay
(likes / age^gravity, Hacker News style) instead of pure recency; keep the
chronological mode as a toggle.
**Learn:** scoring functions; why ranking breaks naive keyset pagination
(scores move between pages) and the snapshot/score-bucket workarounds;
fan-out-on-read limits at celebrity scale.
**Done when you can answer:** what exactly does the ranked feed query's plan
look like, and why can an item appear on two consecutive pages once scores
change mid-scroll?

## Phase 4 — Full-text search
**Build:** replace ILIKE with Postgres FTS: a generated `tsvector` column
(title + description + author names), GIN index, `ts_rank` ordering,
`websearch_to_tsquery` input, prefix matching for autocomplete.
**Learn:** inverted indexes (what Elasticsearch is underneath); stemming,
stop words, ranking; trigram vs FTS — typo tolerance vs language awareness;
keeping the tsvector in sync (generated column vs trigger).
**Done when you can answer:** why can FTS find "running" when you search
"run" but not "runing", and trigram the reverse?

## Phase 5 — Redis caching & rate limiting
**Build:** cache the ranked feed and book rating aggregates with TTLs;
explicit invalidation on new review/like; sliding-window rate limiter on
login (closing the bcrypt-DoS hole noted in auth.service.ts).
**Learn:** cache-aside; invalidation strategy vs tolerable staleness; cache
stampedes (locking/jitter); Redis data structures — the rate limiter is a
sorted set.
**Done when you can answer:** a book's cached average rating receives a
1-star review — list every way the cache can now lie, and what your
invalidation does about each.

## Phase 6 — Follow recommendations
**Build:** "who to follow": friends-of-friends (2-hop traversal over the
`follows` edge list, weighted by mutual count) and taste similarity (Jaccard
overlap of `read` shelves). Precompute nightly into a `recommendations`
table; serve reads from it.
**Learn:** graph traversal in SQL (self-joins, recursive CTEs); set
similarity; offline batch jobs vs online queries — the precompute pattern
under every real recommender.
**Done when you can answer:** why does the 2-hop query explode on a dense
graph, and how do LIMIT-per-hop and precomputation each tame it?

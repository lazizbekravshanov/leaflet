# Roadmap

Six phases, ordered by learning value. Each phase ships something visible AND
forces a concept you can't fake. Phase 0 (this repo) is done: schema, session
auth, search, shelves, reviews.

## Phase 1 — Social graph & profiles
**Build:** public profile pages (`/u/[username]`), follow/unfollow, follower/
following lists with pagination.
**Learn:** the `follows` edge list as a directed graph; offset vs cursor
(keyset) pagination — implement offset first, watch `EXPLAIN` show it reading
and discarding rows as the offset grows, then rebuild with a cursor.
**Done when you can answer:** why does `OFFSET 10000 LIMIT 20` get slower the
deeper you page, while `WHERE (created_at, id) < (?, ?)` doesn't?

## Phase 2 — Engagement: comments, likes, counters
**Build:** comments under reviews, like/unlike, like counts everywhere.
**Learn:** the N+1 problem for real (render 20 reviews with their like
counts — first naively, then batched); denormalized counter columns vs
`COUNT(*)`; atomic `UPDATE ... SET likes = likes + 1` vs read-modify-write
races.
**Done when you can answer:** when a like row and a counter column disagree,
which one is the truth, and what keeps them converging?

## Phase 3 — Activity feed & feed ranking
**Build:** a home feed of reviews/shelvings from people you follow. Raw SQL
(`$queryRaw`), keyset-paginated. v1 chronological; v2 ranked by a score
(engagement vs recency decay, e.g. likes / age^gravity — Hacker News style).
**Learn:** fan-out-on-read vs fan-out-on-write — why the read-time JOIN
through `follows` is the right v1 and what breaks at celebrity scale; covering
composite indexes for the feed query; scoring functions and why ranking kills
naive cursor pagination (scores change between pages).
**Done when you can answer:** what exactly does the feed query's plan look
like, and at what follower/activity shape does fan-out-on-read stop working?

## Phase 4 — Full-text search
**Build:** replace ILIKE with Postgres FTS: `tsvector` column (title +
description + author names), GIN index, `ts_rank` ordering, `websearch_to_tsquery`
input, prefix matching for an autocomplete box.
**Learn:** inverted indexes (what Elasticsearch is underneath); stemming,
stop words, ranking; trigram vs FTS — when each wins (typo tolerance vs
language awareness); keeping the tsvector in sync (generated column vs
trigger).
**Done when you can answer:** why can FTS find "running" when you search
"run" but not find "runing", and trigram the reverse?

## Phase 5 — Redis caching & rate limiting
**Build:** cache the ranked feed and book rating aggregates in Redis with
TTLs; explicit invalidation on new review/like; sliding-window rate limiter on
login (closing the bcrypt-DoS hole noted in auth.service.ts).
**Learn:** cache-aside pattern; the two hard things — invalidation (TTL vs
event-driven, and what staleness each tolerates) and stampedes (locking /
jitter); Redis data structures (strings, hashes, sorted sets — the rate
limiter is a sorted set).
**Done when you can answer:** a book's average rating is cached and someone
posts a 1-star review — list every way the cache can now lie to you, and what
your invalidation does about each.

## Phase 6 — Follow recommendations
**Build:** "who to follow": friends-of-friends (2-hop graph traversal in SQL,
weighted by mutual count) and taste similarity (users whose `read` shelves
overlap yours — Jaccard similarity over shelf_items). Precompute nightly into
a `recommendations` table; serve reads from it.
**Learn:** graph traversal in a relational store (self-joins on the edge
list, recursive CTEs); set-similarity measures; offline batch jobs vs online
queries — the precompute pattern that underlies every real recommender.
**Done when you can answer:** why does the 2-hop query explode on a dense
graph, and how do LIMIT-per-hop and precomputation each tame it?

-- Benchmark dataset for Phase 2 (denormalized counters). NOT for production.
-- Inflates the DB to a scale where the planner's choices are real and the
-- per-row COUNT(*) in the feed/people queries has visible cost.
--
-- Run against a throwaway DB:
--   docker exec -i <pg> psql -U leaflet -d leaflet < prisma/bench-seed.sql
--
-- Idempotent-ish: every INSERT uses ON CONFLICT DO NOTHING, so re-running is a
-- no-op. Synthetic rows are namespaced 'bu_'/'br_' so they never collide with
-- the real seed and can be wiped with DELETE ... WHERE id LIKE 'bu_%'.

\set ON_ERROR_STOP on
\timing off

-- 2,000 synthetic users -------------------------------------------------------
INSERT INTO users (id, email, username, password_hash, created_at, updated_at)
SELECT 'bu_'||g, 'bench'||g||'@x.test', 'bench_'||g, 'x',
       now() - (g || ' minutes')::interval, now()
FROM generate_series(1, 2000) g
ON CONFLICT DO NOTHING;

-- Follow graph: each user follows 30 pseudo-random others (~60k edges) --------
INSERT INTO follows (follower_id, followee_id, created_at)
SELECT 'bu_'||u.g, 'bu_'||f.g, now()
FROM generate_series(1, 2000) u(g)
CROSS JOIN LATERAL (
  SELECT g FROM generate_series(1, 2000) g
  WHERE g <> u.g
  ORDER BY md5(g::text || ':' || u.g::text)
  LIMIT 30
) f(g)
ON CONFLICT DO NOTHING;

-- Reviews: each user reviews 15 distinct books (~30k reviews) -----------------
INSERT INTO reviews (id, user_id, book_id, body, created_at, updated_at)
SELECT 'br_'||u.g||'_'||b.rn,
       'bu_'||u.g,
       b.id,
       'Bench review body for load testing the feed and counters.',
       now() - ((hashtext('br_'||u.g||'_'||b.rn) % 129600 + 129600) || ' minutes')::interval,
       now()
FROM generate_series(1, 2000) u(g)
CROSS JOIN LATERAL (
  SELECT id, row_number() OVER () AS rn
  FROM books
  ORDER BY md5(id || ':' || u.g::text)
  LIMIT 15
) b
ON CONFLICT DO NOTHING;

-- Ratings to match (the feed LEFT JOINs ratings on review rows) ---------------
INSERT INTO ratings (user_id, book_id, value, created_at, updated_at)
SELECT r.user_id, r.book_id, 1 + (abs(hashtext(r.id)) % 5), r.created_at, now()
FROM reviews r
WHERE r.id LIKE 'br_%'
ON CONFLICT DO NOTHING;

-- Likes: each bench review gets 5..24 likes from pseudo-random users ----------
-- (~hundreds of thousands of rows — this is the table the feed COUNT(*)s hit).
INSERT INTO likes (user_id, review_id, created_at)
SELECT 'bu_'||liker.g, r.id, now()
FROM reviews r
CROSS JOIN LATERAL (
  SELECT g FROM generate_series(1, 2000) g
  ORDER BY md5(g::text || ':' || r.id)
  LIMIT 5 + (abs(hashtext(r.id)) % 20)
) liker(g)
WHERE r.id LIKE 'br_%'
ON CONFLICT DO NOTHING;

-- 50,000 synthetic books (Phase 4 search benchmark) ------------------------
-- Inserted AFTER the review/like block above so those still reference the 50
-- real books; these add catalog scale so the FTS GIN index beats a seq scan.
-- Only columns that exist pre-migration are set (no authors_text) so this file
-- runs against both schemas; the generated search_vector derives from
-- title+description for these. Titles/descriptions seed real lexemes
-- ("running", "sailing", …) so stemming and typo-fallback are demonstrable.
INSERT INTO books (id, open_library_id, title, description, cover_id, published_year, created_at)
SELECT 'bb_'||g,
       'OLBENCH'||g||'W',
       initcap((ARRAY['the','a','silent','burning','hidden','lost','northern','crimson','endless','running'])[1+(g%10)])
         ||' '||(ARRAY['Garden','Empire','River','House','Song','Light','Sea','Forest','Crown','Machine'])[1+((g/10)%10)]
         ||' of '||(ARRAY['Dust','Glass','Salt','Iron','Echoes','Ash','Mirrors','Thorns','Tide','Smoke'])[1+((g/100)%10)],
       'A story of '||(ARRAY['running','sailing','building','dreaming','wandering','fighting','loving','searching'])[1+(g%8)]
         ||' across '||(ARRAY['empires','oceans','centuries','cities','deserts','memories'])[1+((g/7)%6)]||'.',
       (g % 1000),
       1900 + (g % 125),
       now()
FROM generate_series(1, 50000) g
ON CONFLICT DO NOTHING;

-- Reconcile the denormalized counters (Phase 2). The bulk INSERTs above write
-- to `likes`/`follows` directly and bypass the per-write counter maintenance in
-- the repositories, so the columns are stale until we recompute them from the
-- source rows. Without this, reviews.like_count stays 0 and the ranked feed
-- (Phase 3) sees no engagement. Same backfill the migration and seed-demo run.
UPDATE reviews r SET like_count = COALESCE(c.n, 0)
  FROM (SELECT review_id, COUNT(*)::int AS n FROM likes GROUP BY review_id) c
 WHERE c.review_id = r.id;
UPDATE reviews SET like_count = 0 WHERE id NOT IN (SELECT DISTINCT review_id FROM likes);
UPDATE users u SET
  follower_count  = (SELECT COUNT(*) FROM follows f WHERE f.followee_id = u.id),
  following_count = (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id);

-- Phase 5 caches/counters from source.
UPDATE users u SET review_count = (SELECT COUNT(*) FROM reviews rv WHERE rv.user_id = u.id);
UPDATE books b SET rating_count = COALESCE(c.n, 0), avg_rating = c.avg
  FROM (SELECT book_id, COUNT(*)::int AS n, AVG(value)::float8 AS avg FROM ratings GROUP BY book_id) c
 WHERE c.book_id = b.id;

ANALYZE users; ANALYZE follows; ANALYZE reviews; ANALYZE ratings; ANALYZE likes; ANALYZE books;

SELECT
  (SELECT count(*) FROM users)   AS users,
  (SELECT count(*) FROM follows) AS follows,
  (SELECT count(*) FROM reviews) AS reviews,
  (SELECT count(*) FROM likes)   AS likes;

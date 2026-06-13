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

ANALYZE users; ANALYZE follows; ANALYZE reviews; ANALYZE ratings; ANALYZE likes;

SELECT
  (SELECT count(*) FROM users)   AS users,
  (SELECT count(*) FROM follows) AS follows,
  (SELECT count(*) FROM reviews) AS reviews,
  (SELECT count(*) FROM likes)   AS likes;

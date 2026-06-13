// THE feed query — the most important SQL in the project. Raw on purpose so
// you can EXPLAIN ANALYZE it (see LEARNING.md). Architecture notes:
//
// FAN-OUT-ON-READ: we compute the feed at read time by joining through
// `follows`. The alternative (fan-out-on-write: push a row into every
// follower's precomputed feed at publish time) trades write amplification for
// read speed and is what social networks do at celebrity scale. At our scale,
// the read-time join through indexed FKs is the right answer.
//
// KEYSET (cursor) PAGINATION, not OFFSET: `OFFSET 10000` must read and throw
// away 10000 rows; `WHERE (at, item_id) < (cursor)` seeks straight to the
// boundary via the index. It's also stable under inserts — new activity
// can't shift items into the next page (no duplicates/gaps while scrolling).
// The cursor is the full ORDER BY key: `at` alone isn't unique, so ties
// (same timestamp) need item_id as the tiebreaker — Postgres compares
// (a,b) < (x,y) lexicographically, exactly matching ORDER BY at DESC, id DESC.
//
// UNION ALL merges two activity sources (reviews + shelvings) into one
// stream. UNION (without ALL) would add a dedup sort for rows that can't be
// duplicates anyway — compare the plans.
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type FeedRow = {
  kind: "review" | "shelved";
  item_id: string;
  at: Date;
  username: string;
  avatar_url: string | null;
  book_id: string;
  book_title: string;
  book_authors: string | null;
  cover_id: number | null;
  review_id: string | null;
  body: string | null;
  rating: number | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  shelf_name: string | null;
  // Only populated by listRanked (sort=top): the engagement/recency score the
  // row was ordered by, echoed into the cursor. undefined in chronological mode.
  score?: number;
};

export const feedRepository = {
  // Fetches limit+1 rows: the extra row only signals "there is a next page";
  // the service slices it off and turns row #limit into the next cursor.
  list(
    userId: string,
    cursor: { at: Date; itemId: string } | null,
    limit: number,
  ): Promise<FeedRow[]> {
    // Prisma.sql composes fragments while keeping everything parameterized —
    // the cursor values are still bind params, never string-concatenated.
    const cursorFilter = cursor
      ? Prisma.sql`WHERE (a.at, a.item_id) < (${cursor.at}, ${cursor.itemId})`
      : Prisma.empty;

    return prisma.$queryRaw<FeedRow[]>`
      WITH followed AS (
        SELECT followee_id FROM follows WHERE follower_id = ${userId}
      ),
      activity AS (
        -- Source 1: reviews by people I follow
        SELECT 'review'::text   AS kind,
               r.id             AS item_id,
               r.created_at     AS at,
               r.user_id,
               r.book_id,
               r.id             AS review_id,
               r.body,
               NULL::text       AS shelf_name,
               r.like_count                 -- denormalized (Phase 2)
          FROM reviews r
         WHERE r.user_id IN (SELECT followee_id FROM followed)
        UNION ALL
        -- Source 2: books they shelved (no review, so no likes)
        SELECT 'shelved',
               s.id || ':' || si.book_id,  -- composite-PK rows need a synthetic id
               si.added_at,
               s.user_id,
               si.book_id,
               NULL,
               NULL,
               s.name,
               0
          FROM shelf_items si
          JOIN shelves s ON s.id = si.shelf_id
         WHERE s.user_id IN (SELECT followee_id FROM followed)
      )
      SELECT a.kind,
             a.item_id,
             a.at,
             u.username,
             u.avatar_url,
             b.id    AS book_id,
             b.title AS book_title,
             (SELECT string_agg(a2.name, ', ' ORDER BY ba.position)
                FROM book_authors ba
                JOIN authors a2 ON a2.id = ba.author_id
               WHERE ba.book_id = b.id)                         AS book_authors,
             b.cover_id,
             a.review_id,
             a.body,
             rt.value::int AS rating,
             -- like_count is the denormalized reviews.like_count, carried
             -- through the activity CTE -- no per-row COUNT(*) subquery, no heap
             -- fetches into the likes table. comment_count is the identical
             -- pattern, deliberately left as a subquery for now (Phase 2 scope
             -- is like_count + follower_count; see DECISIONS.md).
             a.like_count,
             COALESCE((SELECT COUNT(*)::int FROM comments c
                        WHERE c.review_id = a.review_id), 0)    AS comment_count,
             EXISTS(SELECT 1 FROM likes l
                     WHERE l.review_id = a.review_id
                       AND l.user_id = ${userId})               AS liked_by_me
        FROM activity a
        JOIN users u ON u.id = a.user_id
        JOIN books b ON b.id = a.book_id
        LEFT JOIN ratings rt
               ON a.kind = 'review'
              AND rt.user_id = a.user_id
              AND rt.book_id = a.book_id
        ${cursorFilter}
       ORDER BY a.at DESC, a.item_id DESC
       LIMIT ${limit + 1}
    `;
  },

  // RANKED feed (sort=top) — Phase 3. Same fan-out-on-read activity set as
  // list(), but ordered by an engagement-vs-recency score instead of pure
  // recency. The score is the Hacker News shape:
  //
  //     score = (like_count + 1) / (age_hours + 2) ^ gravity      gravity = 1.8
  //
  // - `+ 1` smooths votes so a zero-like item (and every shelving, which has no
  //   review and thus no likes) still ranks by recency instead of collapsing to
  //   0; more likes lift the numerator. `+ 2` on age keeps brand-new items from
  //   dividing by ~0 and spiking. Both constants are HN's.
  // - `snapshotAt` FREEZES the clock: age is measured from one fixed instant
  //   captured on the first page and threaded through the cursor, so the
  //   time-decay component can't shift the ordering mid-scroll.
  //
  // Why this differs from list() (measured — see LEARNING.md §12): BOTH modes
  // currently top-N heapsort the candidate set, since neither keyset is
  // index-served on this schema. The real distinction is that list()'s key
  // `(created_at, item_id)` COULD be made sortless with per-source indexes
  // (a MergeAppend over ordered scans), whereas `score` is a now()-dependent
  // COMPUTED expression that can NEVER be indexed — ranking fundamentally
  // forfeits the index. On the bench set that costs ~2.4x (the power() per
  // candidate + an extra sort). Score + the per-row display subqueries are
  // deferred to the LIMITed page: compute score in `scored`, paginate in
  // `page`, then join only the 10 surviving rows.
  listRanked(
    userId: string,
    snapshotAt: Date,
    cursor: { score: number; itemId: string } | null,
    limit: number,
  ): Promise<FeedRow[]> {
    // The keyset filter references the computed `score`, so it lives in the
    // outer query over the `scored` CTE (a SELECT alias can't be used in its
    // own WHERE). Still fully parameterized.
    const cursorFilter = cursor
      ? Prisma.sql`WHERE (s.score, s.item_id) < (${cursor.score}, ${cursor.itemId})`
      : Prisma.empty;

    return prisma.$queryRaw<FeedRow[]>`
      WITH followed AS (
        SELECT followee_id FROM follows WHERE follower_id = ${userId}
      ),
      activity AS (
        SELECT 'review'::text AS kind, r.id AS item_id, r.created_at AS at,
               r.user_id, r.book_id, r.id AS review_id, r.body,
               NULL::text AS shelf_name, r.like_count
          FROM reviews r
         WHERE r.user_id IN (SELECT followee_id FROM followed)
        UNION ALL
        SELECT 'shelved', s.id || ':' || si.book_id, si.added_at,
               s.user_id, si.book_id, NULL, NULL, s.name, 0
          FROM shelf_items si
          JOIN shelves s ON s.id = si.shelf_id
         WHERE s.user_id IN (SELECT followee_id FROM followed)
      ),
      scored AS (
        -- ::float8 matters at the driver boundary: the raw expression is
        -- numeric (extract/power return numeric), which node-postgres hands
        -- back as a STRING. The score flows into the keyset cursor and must
        -- round-trip as a JS number -- float8 maps to an IEEE-754 double
        -- losslessly, so the boundary row's recomputed score equals the cursor
        -- value exactly. Without the cast the cursor breaks and page 2 is empty.
        SELECT a.*,
               ((a.like_count + 1)
                 / power(
                     greatest(extract(epoch FROM (${snapshotAt}::timestamptz - a.at)) / 3600.0, 0) + 2,
                     1.8
                   ))::float8 AS score
          FROM activity a
      ),
      page AS (
        SELECT s.* FROM scored s
        ${cursorFilter}
        ORDER BY s.score DESC, s.item_id DESC
        LIMIT ${limit + 1}
      )
      SELECT p.kind,
             p.item_id,
             p.at,
             u.username,
             u.avatar_url,
             b.id    AS book_id,
             b.title AS book_title,
             (SELECT string_agg(a2.name, ', ' ORDER BY ba.position)
                FROM book_authors ba
                JOIN authors a2 ON a2.id = ba.author_id
               WHERE ba.book_id = b.id)                         AS book_authors,
             b.cover_id,
             p.review_id,
             p.body,
             rt.value::int AS rating,
             p.like_count,
             p.score,
             COALESCE((SELECT COUNT(*)::int FROM comments c
                        WHERE c.review_id = p.review_id), 0)    AS comment_count,
             EXISTS(SELECT 1 FROM likes l
                     WHERE l.review_id = p.review_id
                       AND l.user_id = ${userId})               AS liked_by_me,
             p.shelf_name
        FROM page p
        JOIN users u ON u.id = p.user_id
        JOIN books b ON b.id = p.book_id
        LEFT JOIN ratings rt
               ON p.kind = 'review'
              AND rt.user_id = p.user_id
              AND rt.book_id = p.book_id
       ORDER BY p.score DESC, p.item_id DESC
    `;
  },
};

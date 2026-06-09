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
               NULL::text       AS shelf_name
          FROM reviews r
         WHERE r.user_id IN (SELECT followee_id FROM followed)
        UNION ALL
        -- Source 2: books they shelved
        SELECT 'shelved',
               s.id || ':' || si.book_id,  -- composite-PK rows need a synthetic id
               si.added_at,
               s.user_id,
               si.book_id,
               NULL,
               NULL,
               s.name
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
             -- Scalar subqueries run once per emitted row — bounded by LIMIT,
             -- so this stays cheap. (For an unbounded report you'd aggregate
             -- with GROUP BY before joining instead.)
             COALESCE((SELECT COUNT(*)::int FROM likes l
                        WHERE l.review_id = a.review_id), 0)    AS like_count,
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
};

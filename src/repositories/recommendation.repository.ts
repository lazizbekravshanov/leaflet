import { prisma } from "@/lib/db";

export type RecRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  score: number;
  reason: string;
  mutuals: number;
};

export const recommendationRepository = {
  // OFFLINE precompute for one user (Phase 6). Two signals, combined:
  //
  //  1. friends-of-friends — a 2-HOP traversal of the `follows` edge list: a
  //     self-join (follows f1 JOIN follows f2 ON f2.follower = f1.followee)
  //     finds people followed by people I follow, weighted by how many of my
  //     followees follow them (the mutual count). This is graph traversal in
  //     SQL; on a dense graph the 2-hop fan-out explodes, which is exactly why
  //     it's precomputed here and not run per request.
  //  2. taste similarity — JACCARD overlap of READ shelves: |A∩B| / |A∪B| over
  //     the books each of us has finished. Restricted to candidates who share
  //     at least one read book (the `shared_read` CTE) so we never score the
  //     whole user base.
  //
  // Already-followed users and myself are excluded at compute time. Score
  // weights jaccard heavily (a strong taste match is rarer/stronger than one
  // shared follow). Delete-then-insert in one transaction so a reader never
  // sees a half-rebuilt set.
  async refreshForUser(userId: string): Promise<void> {
    await prisma.$transaction([
      prisma.$executeRaw`DELETE FROM recommendations WHERE user_id = ${userId}`,
      prisma.$executeRaw`
        WITH my_following AS (
          SELECT followee_id FROM follows WHERE follower_id = ${userId}
        ),
        my_read AS (
          SELECT si.book_id FROM shelf_items si
            JOIN shelves s ON s.id = si.shelf_id
           WHERE s.user_id = ${userId} AND s.type = 'READ'
        ),
        my_read_count AS (SELECT count(*)::int AS n FROM my_read),
        -- 1. friends-of-friends (2-hop self-join), weighted by mutual count
        fof AS (
          SELECT f2.followee_id AS candidate, count(*)::int AS mutuals
            FROM follows f1
            JOIN follows f2 ON f2.follower_id = f1.followee_id
           WHERE f1.follower_id = ${userId}
             AND f2.followee_id <> ${userId}
             AND f2.followee_id NOT IN (SELECT followee_id FROM my_following)
           GROUP BY f2.followee_id
        ),
        -- 2. taste: candidates sharing >=1 read book, with the intersection size
        shared_read AS (
          SELECT s.user_id AS candidate, count(*)::int AS overlap
            FROM shelf_items si
            JOIN shelves s ON s.id = si.shelf_id AND s.type = 'READ'
           WHERE si.book_id IN (SELECT book_id FROM my_read)
             AND s.user_id <> ${userId}
             AND s.user_id NOT IN (SELECT followee_id FROM my_following)
           GROUP BY s.user_id
        ),
        cand_read_count AS (
          SELECT s.user_id, count(*)::int AS n
            FROM shelf_items si JOIN shelves s ON s.id = si.shelf_id AND s.type = 'READ'
           WHERE s.user_id IN (SELECT candidate FROM shared_read)
           GROUP BY s.user_id
        ),
        taste AS (
          SELECT sr.candidate,
                 sr.overlap::float8
                   / NULLIF((SELECT n FROM my_read_count) + COALESCE(crc.n, 0) - sr.overlap, 0)
                   AS jaccard
            FROM shared_read sr
            LEFT JOIN cand_read_count crc ON crc.user_id = sr.candidate
        ),
        combined AS (
          SELECT c.candidate,
                 COALESCE(f.mutuals, 0) AS mutuals,
                 COALESCE(t.jaccard, 0) AS jaccard
            FROM (SELECT candidate FROM fof UNION SELECT candidate FROM taste) c
            LEFT JOIN fof   f ON f.candidate = c.candidate
            LEFT JOIN taste t ON t.candidate = c.candidate
        )
        INSERT INTO recommendations
          (user_id, recommended_user_id, score, reason, mutuals, computed_at)
        SELECT ${userId},
               candidate,
               mutuals * 1.0 + jaccard * 10.0,
               CASE WHEN jaccard * 10.0 >= mutuals THEN 'taste' ELSE 'mutuals' END,
               mutuals,
               now()
          FROM combined
         WHERE mutuals * 1.0 + jaccard * 10.0 > 0
         ORDER BY mutuals * 1.0 + jaccard * 10.0 DESC
         LIMIT 20
      `,
    ]);
  },

  // Online read: precomputed rows joined to display fields, best first. Filters
  // out anyone the viewer has followed SINCE the last precompute, so a stale set
  // never recommends someone you already follow.
  listForUser(userId: string, limit: number): Promise<RecRow[]> {
    return prisma.$queryRaw<RecRow[]>`
      SELECT u.id, u.username, u.avatar_url, u.bio,
             r.score, r.reason, r.mutuals
        FROM recommendations r
        JOIN users u ON u.id = r.recommended_user_id
       WHERE r.user_id = ${userId}
         AND r.recommended_user_id NOT IN (
           SELECT followee_id FROM follows WHERE follower_id = ${userId}
         )
       ORDER BY r.score DESC
       LIMIT ${limit}
    `;
  },

  // Freshness check for the lazy refresh: the newest precomputed row's age.
  async latestComputedAt(userId: string): Promise<Date | null> {
    const row = await prisma.recommendation.findFirst({
      where: { userId },
      orderBy: { computedAt: "desc" },
      select: { computedAt: true },
    });
    return row?.computedAt ?? null;
  },
};

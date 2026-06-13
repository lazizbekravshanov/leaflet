import { prisma } from "@/lib/db";

export const likeRepository = {
  // Like + counter maintenance in ONE statement (Phase 2). Three properties
  // matter, and they're why this is raw SQL, not two Prisma calls:
  //
  // 1. ATOMIC. The INSERT and the reviews.like_count bump are one statement =
  //    one implicit transaction. No reader can ever observe the like row
  //    without the +1 (or vice versa), and a crash can't apply one without the
  //    other. Two app-level calls could be interrupted between them.
  // 2. IDEMPOTENT, and the counter respects it. ON CONFLICT DO NOTHING makes a
  //    double-click a no-op on `likes`; the counter delta is literally the
  //    number of rows the INSERT actually produced — `(SELECT COUNT(*) FROM
  //    ins)` is 0 or 1 — so a duplicate like adds 0. This is the bug the naive
  //    version has: "INSERT ... ON CONFLICT; UPDATE SET n = n + 1" inflates the
  //    count on every re-click.
  // 3. RACE-FREE. `SET like_count = like_count + delta` is a read-modify-write
  //    performed by Postgres under the reviews-row write lock, so concurrent
  //    likes serialize and none is lost — unlike reading the count in app code
  //    and writing back a computed value.
  //
  // Returns the review's new like_count (0 if the review no longer exists).
  // Tradeoff: the UPDATE runs even on a duplicate (delta 0), writing one dead
  // tuple per no-op like — cheap and rare, paid for a single-round-trip,
  // always-correct return value.
  async like(userId: string, reviewId: string): Promise<number> {
    const rows = await prisma.$queryRaw<{ like_count: number }[]>`
      WITH ins AS (
        INSERT INTO likes (user_id, review_id, created_at)
        VALUES (${userId}, ${reviewId}, now())
        ON CONFLICT (user_id, review_id) DO NOTHING
        RETURNING 1
      )
      UPDATE reviews
         SET like_count = like_count + (SELECT COUNT(*) FROM ins)::int
       WHERE id = ${reviewId}
      RETURNING like_count
    `;
    return rows[0]?.like_count ?? 0;
  },

  async unlike(userId: string, reviewId: string): Promise<number> {
    const rows = await prisma.$queryRaw<{ like_count: number }[]>`
      WITH del AS (
        DELETE FROM likes
         WHERE user_id = ${userId} AND review_id = ${reviewId}
        RETURNING 1
      )
      UPDATE reviews
         SET like_count = like_count - (SELECT COUNT(*) FROM del)::int
       WHERE id = ${reviewId}
      RETURNING like_count
    `;
    return rows[0]?.like_count ?? 0;
  },

  // Source-of-truth count, straight from the like rows. Kept for the
  // reconciliation/verify path (compare against reviews.like_count); the hot
  // paths now read the denormalized column instead of calling this.
  countForReview(reviewId: string) {
    return prisma.like.count({ where: { reviewId } });
  },
};

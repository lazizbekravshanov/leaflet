import { prisma } from "@/lib/db";

export const followRepository = {
  // Follow + counter maintenance in ONE statement (Phase 2). A single follow
  // edge touches TWO users' counters: the follower's following_count and the
  // followee's follower_count. Both bumps live in the same statement as the
  // INSERT, so the edge and both counters move together or not at all.
  //
  // The delta is `(SELECT COUNT(*) FROM ins)` — 0 or 1 — so a duplicate follow
  // (ON CONFLICT DO NOTHING) bumps nothing. The CASE routes the delta to the
  // right column per row: the WHERE matches exactly the two user rows, and each
  // gets +delta on its own counter, +0 on the other.
  //
  // Lock note: both this and unfollow update `users WHERE id IN (a, b)` with
  // the same plan, so rows are locked in a consistent order — concurrent
  // follows in opposite directions can't deadlock.
  async follow(followerId: string, followeeId: string): Promise<void> {
    await prisma.$executeRaw`
      WITH ins AS (
        INSERT INTO follows (follower_id, followee_id, created_at)
        VALUES (${followerId}, ${followeeId}, now())
        ON CONFLICT (follower_id, followee_id) DO NOTHING
        RETURNING 1
      ), delta AS (SELECT COUNT(*)::int AS d FROM ins)
      UPDATE users u
         SET following_count = following_count
               + CASE WHEN u.id = ${followerId} THEN (SELECT d FROM delta) ELSE 0 END,
             follower_count  = follower_count
               + CASE WHEN u.id = ${followeeId} THEN (SELECT d FROM delta) ELSE 0 END
       WHERE u.id IN (${followerId}, ${followeeId})
    `;
  },

  async unfollow(followerId: string, followeeId: string): Promise<void> {
    await prisma.$executeRaw`
      WITH del AS (
        DELETE FROM follows
         WHERE follower_id = ${followerId} AND followee_id = ${followeeId}
        RETURNING 1
      ), delta AS (SELECT COUNT(*)::int AS d FROM del)
      UPDATE users u
         SET following_count = following_count
               - CASE WHEN u.id = ${followerId} THEN (SELECT d FROM delta) ELSE 0 END,
             follower_count  = follower_count
               - CASE WHEN u.id = ${followeeId} THEN (SELECT d FROM delta) ELSE 0 END
       WHERE u.id IN (${followerId}, ${followeeId})
    `;
  },

  async isFollowing(followerId: string, followeeId: string) {
    const row = await prisma.follow.findUnique({
      where: { followerId_followeeId: { followerId, followeeId } },
    });
    return row !== null;
  },

  // Reads the denormalized counters off the user row — one PK lookup, no scan
  // of `follows`. Was two COUNT(*) index scans before Phase 2.
  async counts(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { followerCount: true, followingCount: true },
    });
    return {
      followers: user?.followerCount ?? 0,
      following: user?.followingCount ?? 0,
    };
  },
};

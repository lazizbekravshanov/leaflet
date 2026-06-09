import { prisma } from "@/lib/db";

export const followRepository = {
  // Idempotent for the same reason as likes: the composite PK absorbs
  // duplicate follow attempts.
  follow(followerId: string, followeeId: string) {
    return prisma.follow.createMany({
      data: [{ followerId, followeeId }],
      skipDuplicates: true,
    });
  },

  unfollow(followerId: string, followeeId: string) {
    return prisma.follow.deleteMany({ where: { followerId, followeeId } });
  },

  async isFollowing(followerId: string, followeeId: string) {
    const row = await prisma.follow.findUnique({
      where: { followerId_followeeId: { followerId, followeeId } },
    });
    return row !== null;
  },

  // Two index-only counts: followers uses @@index([followeeId]),
  // following uses the PK's leftmost column.
  async counts(userId: string) {
    const [followers, following] = await Promise.all([
      prisma.follow.count({ where: { followeeId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);
    return { followers, following };
  },
};

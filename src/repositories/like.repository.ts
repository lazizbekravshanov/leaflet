import { prisma } from "@/lib/db";

export const likeRepository = {
  // createMany + skipDuplicates makes liking idempotent: a double-click or
  // retry hits the composite PK (user_id, review_id) and becomes a no-op
  // instead of an error. Same INSERT ... ON CONFLICT DO NOTHING idea in SQL.
  like(userId: string, reviewId: string) {
    return prisma.like.createMany({
      data: [{ userId, reviewId }],
      skipDuplicates: true,
    });
  },

  unlike(userId: string, reviewId: string) {
    return prisma.like.deleteMany({ where: { userId, reviewId } });
  },

  countForReview(reviewId: string) {
    return prisma.like.count({ where: { reviewId } });
  },
};

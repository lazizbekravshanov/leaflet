import { prisma } from "@/lib/db";

export const commentRepository = {
  create(data: { userId: string; reviewId: string; body: string }) {
    return prisma.comment.create({
      data,
      include: { user: { select: { id: true, username: true } } },
    });
  },

  findById(id: string) {
    return prisma.comment.findUnique({ where: { id } });
  },

  delete(id: string) {
    return prisma.comment.delete({ where: { id } });
  },

  // Conversation order (oldest first) — served by @@index([reviewId, createdAt]).
  listForReview(reviewId: string) {
    return prisma.comment.findMany({
      where: { reviewId },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: "asc" },
    });
  },

  // One query for all reviews on a book page instead of one per review —
  // this is the batching that avoids the N+1 problem.
  listForReviews(reviewIds: string[]) {
    return prisma.comment.findMany({
      where: { reviewId: { in: reviewIds } },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: "asc" },
    });
  },
};

import { prisma } from "@/lib/db";

export const commentRepository = {
  // Insert + bump reviews.comment_count in one transaction (Phase 5), so the
  // denormalized counter the feed reads can't drift from the rows.
  async create(data: { userId: string; reviewId: string; body: string }) {
    const [comment] = await prisma.$transaction([
      prisma.comment.create({
        data,
        include: { user: { select: { id: true, username: true } } },
      }),
      prisma.$executeRaw`
        UPDATE reviews SET comment_count = comment_count + 1
         WHERE id = ${data.reviewId}`,
    ]);
    return comment;
  },

  findById(id: string) {
    return prisma.comment.findUnique({ where: { id } });
  },

  // Delete + decrement in one atomic statement: the CTE deletes and returns the
  // review_id, and the counter drops only if a row actually went away.
  delete(id: string) {
    return prisma.$executeRaw`
      WITH del AS (
        DELETE FROM comments WHERE id = ${id} RETURNING review_id
      )
      UPDATE reviews SET comment_count = comment_count - 1
       WHERE id = (SELECT review_id FROM del)`;
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

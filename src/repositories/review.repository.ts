import { prisma } from "@/lib/db";

export const reviewRepository = {
  // Review + rating are separate tables (see schema.prisma for the tradeoff),
  // so "review with stars" is two upserts in one transaction: both land or
  // neither does. Upsert (not create) because UNIQUE(user_id, book_id) means
  // submitting again is an edit.
  upsertReviewWithRating(
    userId: string,
    bookId: string,
    body: string,
    rating: number,
  ) {
    return prisma.$transaction([
      prisma.review.upsert({
        where: { userId_bookId: { userId, bookId } },
        create: { userId, bookId, body },
        update: { body },
      }),
      prisma.rating.upsert({
        where: { userId_bookId: { userId, bookId } },
        create: { userId, bookId, value: rating },
        update: { value: rating },
      }),
    ]);
  },

  findById(id: string) {
    return prisma.review.findUnique({ where: { id } });
  },

  // Deleting a review cascades to its comments and likes (FK ON DELETE
  // CASCADE), and we drop the star rating with it in the same transaction —
  // "delete my review" means the opinion is gone, not just the text.
  delete(reviewId: string, userId: string, bookId: string) {
    return prisma.$transaction([
      prisma.review.delete({ where: { id: reviewId } }),
      prisma.rating.deleteMany({ where: { userId, bookId } }),
    ]);
  },

  // Reviews don't have an FK to ratings — they meet on (user_id, book_id).
  // Rather than a raw JOIN, fetch reviews then their authors' ratings in a
  // second indexed query and merge in JS. Two round-trips, both index-only;
  // contrast with the single-query raw SQL style in book.repository.search.
  // Comments come along via include — ONE query for all reviews' comments,
  // not one per review (no N+1). Like count is the denormalized
  // reviews.like_count scalar (Phase 2), not a _count aggregate.
  async listForBook(bookId: string, viewerId: string | null, limit = 20) {
    const reviews = await prisma.review.findMany({
      where: { bookId },
      include: {
        user: { select: { id: true, username: true } },
        comments: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" }, // served by @@index([bookId, createdAt desc])
      take: limit,
    });
    if (reviews.length === 0) return [];

    const reviewIds = reviews.map((r) => r.id);
    const [ratings, myLikes] = await Promise.all([
      prisma.rating.findMany({
        where: { bookId, userId: { in: reviews.map((r) => r.userId) } },
      }),
      viewerId
        ? prisma.like.findMany({
            where: { userId: viewerId, reviewId: { in: reviewIds } },
          })
        : Promise.resolve([]),
    ]);
    const ratingByUser = new Map(ratings.map((r) => [r.userId, r.value]));
    const likedIds = new Set(myLikes.map((l) => l.reviewId));

    return reviews.map((review) => ({
      ...review,
      rating: ratingByUser.get(review.userId) ?? null,
      likeCount: review.likeCount,
      likedByMe: likedIds.has(review.id),
    }));
  },
};

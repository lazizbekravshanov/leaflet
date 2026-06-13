import { prisma } from "@/lib/db";

// The denormalized caches a review/rating write touches: the book's rating
// aggregate (recomputed from `ratings`) and the user's review_count (from
// `reviews`). Returned as transaction STEPS so they run in the same tx as the
// write — synchronous invalidation, never a separate round-trip that could
// crash between the write and the cache update. AVG over zero rows is NULL,
// which is exactly "unrated".
function recomputeForReviewWrite(userId: string, bookId: string) {
  return [
    prisma.$executeRaw`
      UPDATE books SET
        rating_count = (SELECT COUNT(*)::int  FROM ratings WHERE book_id = ${bookId}),
        avg_rating   = (SELECT AVG(value)::float8 FROM ratings WHERE book_id = ${bookId})
       WHERE id = ${bookId}`,
    prisma.$executeRaw`
      UPDATE users SET
        review_count = (SELECT COUNT(*)::int FROM reviews WHERE user_id = ${userId})
       WHERE id = ${userId}`,
  ];
}

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
      // Invalidate the denormalized caches by recomputing from source, in the
      // SAME transaction — they recompute against the just-written rows, so a
      // reader never sees the review/rating without the updated aggregate.
      // Upsert means "new or edit"; recompute (vs ±1) is correct for both
      // without detecting which happened.
      ...recomputeForReviewWrite(userId, bookId),
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
      // Same recompute after the rows are gone (book loses a rating, user loses
      // a review). Comment/like counts ride the cascade away with the review.
      ...recomputeForReviewWrite(userId, bookId),
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

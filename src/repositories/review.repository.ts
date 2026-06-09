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

  // Reviews don't have an FK to ratings — they meet on (user_id, book_id).
  // Rather than a raw JOIN, fetch reviews then their authors' ratings in a
  // second indexed query and merge in JS. Two round-trips, both index-only;
  // contrast with the single-query raw SQL style in book.repository.search.
  async listForBook(bookId: string, limit = 20) {
    const reviews = await prisma.review.findMany({
      where: { bookId },
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: "desc" }, // served by @@index([bookId, createdAt desc])
      take: limit,
    });
    if (reviews.length === 0) return [];

    const ratings = await prisma.rating.findMany({
      where: { bookId, userId: { in: reviews.map((r) => r.userId) } },
    });
    const byUser = new Map(ratings.map((r) => [r.userId, r.value]));

    return reviews.map((review) => ({
      ...review,
      rating: byUser.get(review.userId) ?? null,
    }));
  },
};

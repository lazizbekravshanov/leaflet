import { prisma } from "@/lib/db";

// Read-only queries for the signed-out landing page. The hero and feature
// sections are built from REAL seeded data — the product's content is the
// marketing art, so these pull the most presentable rows.
export const landingRepository = {
  // Most-rated books that have cover art — the hero shelf.
  coverBooks(limit: number) {
    return prisma.book.findMany({
      where: { coverId: { not: null } },
      orderBy: [{ ratings: { _count: "desc" } }, { title: "asc" }],
      take: limit,
    });
  },

  // The most-liked review with a decent body length, for the typeset
  // review feature section.
  async featuredReview() {
    const review = await prisma.review.findFirst({
      orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
      include: {
        user: { select: { username: true } },
        book: true,
        _count: { select: { likes: true } },
      },
    });
    if (!review) return null;
    const rating = await prisma.rating.findUnique({
      where: { userId_bookId: { userId: review.userId, bookId: review.bookId } },
    });
    return { ...review, rating: rating?.value ?? null };
  },

  // A couple of recent reviews for the cropped feed composition.
  async feedSample(limit: number) {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { username: true } },
        book: true,
      },
    });
    const ratings = await prisma.rating.findMany({
      where: {
        OR: reviews.map((r) => ({ userId: r.userId, bookId: r.bookId })),
      },
    });
    const byKey = new Map(ratings.map((r) => [`${r.userId}:${r.bookId}`, r.value]));
    return reviews.map((r) => ({
      ...r,
      rating: byKey.get(`${r.userId}:${r.bookId}`) ?? null,
    }));
  },
};

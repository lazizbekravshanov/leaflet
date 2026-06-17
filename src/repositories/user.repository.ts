// Repositories are the only modules that touch Prisma. Services depend on
// these functions, never on the client — so swapping the ORM, adding caching,
// or pointing at a different database is a one-layer change.
import { prisma } from "@/lib/db";

export type NewUser = {
  email: string;
  username: string;
  passwordHash: string;
};

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  },

  updateProfile(
    id: string,
    data: { displayName: string | null; bio: string | null; avatarUrl: string | null },
  ) {
    return prisma.user.update({ where: { id }, data });
  },

  updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash } });
  },

  setEmailVerified(id: string) {
    return prisma.user.update({ where: { id }, data: { emailVerifiedAt: new Date() } });
  },

  // The people directory: every user plus relationship counts, now both
  // denormalized columns (follower_count from Phase 2, review_count from
  // Phase 5) — two scalar reads, no COUNT(*) subqueries at all.
  //
  // OFFSET pagination (Phase 1), not keyset — deliberately. This is a small,
  // bounded, browseable directory (not a deep hot feed): OFFSET's "read and
  // discard N rows" cost is irrelevant at these depths, and a page-number UI is
  // what users expect for a directory. Keyset is the feed's tool, for unbounded
  // depth where discarding rows would dominate. limit+1 detects a next page.
  async listPage(limit: number, offset: number) {
    const rows = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        bio: true,
        avatarUrl: true,
        followerCount: true,
        reviewCount: true,
      },
      orderBy: { createdAt: "asc" },
      take: limit + 1,
      skip: offset,
    });
    return { items: rows.slice(0, limit), hasMore: rows.length > limit };
  },

  // Profile reviews, paginated (Phase 1) — was an unbounded load. Same OFFSET
  // approach and rationale as the directory: a profile is shallow and browsed
  // by page, not infinite-scrolled.
  async listReviewsByUser(userId: string, limit: number, offset: number) {
    const rows = await prisma.review.findMany({
      where: { userId },
      include: { book: true },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      skip: offset,
    });
    return { items: rows.slice(0, limit), hasMore: rows.length > limit };
  },

  // Creating the user and their three system shelves in one nested create
  // makes signup atomic: either everything exists or nothing does.
  create(data: NewUser) {
    return prisma.user.create({
      data: {
        ...data,
        shelves: {
          create: [
            { name: "Want to Read", type: "WANT_TO_READ" },
            { name: "Reading", type: "READING" },
            { name: "Read", type: "READ" },
          ],
        },
      },
    });
  },
};

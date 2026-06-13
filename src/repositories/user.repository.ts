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

  // The people directory: every user plus relationship counts, now both
  // denormalized columns (follower_count from Phase 2, review_count from
  // Phase 5) — two scalar reads, no COUNT(*) subqueries at all.
  listAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        username: true,
        bio: true,
        avatarUrl: true,
        followerCount: true,
        reviewCount: true,
      },
      orderBy: { createdAt: "asc" },
    });
  },

  listReviewsByUser(userId: string) {
    return prisma.review.findMany({
      where: { userId },
      include: { book: true },
      orderBy: { createdAt: "desc" },
    });
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

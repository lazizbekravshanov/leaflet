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

  // The people directory: every user plus relationship counts. _count maps
  // to correlated COUNT subqueries — fine at directory scale; a denormalized
  // follower_count column is the Phase 2 lesson if this ever gets hot.
  listAll() {
    return prisma.user.findMany({
      select: {
        id: true,
        username: true,
        bio: true,
        avatarUrl: true,
        _count: { select: { followers: true, reviews: true } },
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

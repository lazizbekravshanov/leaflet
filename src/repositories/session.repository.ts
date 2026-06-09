import { prisma } from "@/lib/db";

export const sessionRepository = {
  create(data: { tokenHash: string; userId: string; expiresAt: Date }) {
    return prisma.session.create({ data });
  },

  // Expiry is checked in the query, not in JS — a session that outlived its
  // expires_at simply doesn't exist as far as callers can tell.
  findValidWithUser(tokenHash: string) {
    return prisma.session.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
  },

  // deleteMany, not delete: deleting a token that is already gone (double
  // logout, expired-and-cleaned) should be a no-op, not a thrown error.
  deleteByTokenHash(tokenHash: string) {
    return prisma.session.deleteMany({ where: { tokenHash } });
  },

  // "Log out everywhere" — also the right call after a password change.
  deleteAllForUser(userId: string) {
    return prisma.session.deleteMany({ where: { userId } });
  },
};

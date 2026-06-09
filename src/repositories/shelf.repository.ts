import { prisma } from "@/lib/db";
import type { ShelfType } from "@/generated/prisma/enums";

const SYSTEM_TYPES: ShelfType[] = ["WANT_TO_READ", "READING", "READ"];

export const shelfRepository = {
  listForUser(userId: string) {
    return prisma.shelf.findMany({
      where: { userId },
      include: {
        items: {
          include: { book: { include: { authors: { include: { author: true } } } } },
          orderBy: { addedAt: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  findSystemShelf(userId: string, type: ShelfType) {
    return prisma.shelf.findFirst({ where: { userId, type } });
  },

  // Which system shelf (if any) holds this book for this user — drives the
  // "✓ Read" state on the book page.
  async findShelfTypeForBook(userId: string, bookId: string) {
    const item = await prisma.shelfItem.findFirst({
      where: { bookId, shelf: { userId, type: { in: SYSTEM_TYPES } } },
      include: { shelf: true },
    });
    return item?.shelf.type ?? null;
  },

  // "Move" semantics for the three system shelves: a book lives on at most
  // one of them (you can't be reading a book you've finished). The schema
  // can't enforce a constraint across rows of different shelves, so this is
  // the transaction that maintains the invariant:
  //   1. remove the book from the user's OTHER system shelves
  //   2. insert it into the target shelf (idempotent via the composite PK)
  // Both happen atomically — a crash between the two can't strand the book
  // shelfless or doubled. Custom shelves are exempt: a book may sit on any
  // number of those.
  async moveToShelf(targetShelfId: string, userId: string, bookId: string) {
    await prisma.$transaction([
      prisma.shelfItem.deleteMany({
        where: {
          bookId,
          shelfId: { not: targetShelfId },
          shelf: { userId, type: { in: SYSTEM_TYPES } },
        },
      }),
      prisma.shelfItem.upsert({
        where: { shelfId_bookId: { shelfId: targetShelfId, bookId } },
        create: { shelfId: targetShelfId, bookId },
        update: {}, // already there → no-op, keeps original added_at
      }),
    ]);
  },
};

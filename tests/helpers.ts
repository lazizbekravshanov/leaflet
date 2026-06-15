import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";

// Unique, namespaced id so fixtures from different tests never collide — this is
// how the integration tests stay isolated without truncating between them.
export function uid(prefix = "t"): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export async function createUser() {
  const id = uid("u");
  return prisma.user.create({
    data: {
      id,
      email: `${id}@test.local`,
      username: id.slice(0, 20),
      passwordHash: "x", // not a real hash; these tests never call bcrypt
    },
  });
}

export async function createBook(fields: { title?: string; description?: string } = {}) {
  const id = uid("b");
  return prisma.book.create({
    data: {
      id,
      openLibraryId: uid("ol"),
      title: fields.title ?? `Test Book ${id}`,
      description: fields.description ?? null,
    },
  });
}

export async function createReview(userId: string, bookId: string) {
  return prisma.review.create({
    data: { userId, bookId, body: "A test review body, long enough to be real." },
  });
}

// A READ shelf with the given books on it — for taste-recommendation tests.
export async function createReadShelf(userId: string, bookIds: string[]) {
  const shelf = await prisma.shelf.create({
    data: { userId, name: uid("Read"), type: "READ" },
  });
  if (bookIds.length > 0) {
    await prisma.shelfItem.createMany({
      data: bookIds.map((bookId) => ({ shelfId: shelf.id, bookId })),
    });
  }
  return shelf;
}

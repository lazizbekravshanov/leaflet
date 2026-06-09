import { NotFoundError, ValidationError } from "@/lib/errors";
import { shelfRepository } from "@/repositories/shelf.repository";
import { bookRepository } from "@/repositories/book.repository";
import type { ShelfType } from "@/generated/prisma/enums";

const SYSTEM_TYPES = ["WANT_TO_READ", "READING", "READ"] as const;
export type SystemShelfType = (typeof SYSTEM_TYPES)[number];

function parseSystemShelfType(value: unknown): SystemShelfType {
  if (
    typeof value !== "string" ||
    !SYSTEM_TYPES.includes(value as SystemShelfType)
  ) {
    throw new ValidationError(
      `shelfType must be one of: ${SYSTEM_TYPES.join(", ")}`,
    );
  }
  return value as SystemShelfType;
}

export const shelfService = {
  listForUser(userId: string) {
    return shelfRepository.listForUser(userId);
  },

  getShelfTypeForBook(userId: string, bookId: string): Promise<ShelfType | null> {
    return shelfRepository.findShelfTypeForBook(userId, bookId);
  },

  // Business rule: shelving onto a system shelf is a MOVE — the book leaves
  // the other two system shelves. The transaction lives in the repository;
  // the rule that it must happen lives here.
  async shelveBook(userId: string, rawBookId: unknown, rawType: unknown) {
    const type = parseSystemShelfType(rawType);
    const bookId =
      typeof rawBookId === "string" && rawBookId.length > 0
        ? rawBookId
        : (() => {
            throw new ValidationError("bookId is required");
          })();

    const book = await bookRepository.findByIdWithAuthors(bookId);
    if (!book) throw new NotFoundError("Book not found");

    const shelf = await shelfRepository.findSystemShelf(userId, type);
    // Signup creates all three system shelves, so this is a data bug, not a
    // user error — fail loudly.
    if (!shelf) throw new Error(`Missing system shelf ${type} for user ${userId}`);

    await shelfRepository.moveToShelf(shelf.id, userId, bookId);
    return { shelfId: shelf.id, type };
  },
};

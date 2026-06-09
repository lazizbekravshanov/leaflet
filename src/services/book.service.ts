import { NotFoundError } from "@/lib/errors";
import { requireString } from "@/lib/validate";
import { bookRepository } from "@/repositories/book.repository";
import { reviewRepository } from "@/repositories/review.repository";

const SEARCH_LIMIT = 20;

export const bookService = {
  async search(rawTerm: unknown) {
    const term = requireString(rawTerm, "q", { min: 1, max: 100 });
    return bookRepository.search(term, SEARCH_LIMIT);
  },

  // Everything the book page needs in one call: the book, its rating
  // aggregate, and its reviews. The three queries are independent, so they
  // run concurrently — total latency is max(), not sum().
  async getBookPage(bookId: string, viewerId: string | null) {
    const [book, stats, reviews] = await Promise.all([
      bookRepository.findByIdWithAuthors(bookId),
      bookRepository.getRatingStats(bookId),
      reviewRepository.listForBook(bookId, viewerId),
    ]);
    if (!book) throw new NotFoundError("Book not found");
    return { book, stats, reviews };
  },
};

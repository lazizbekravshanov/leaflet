import { NotFoundError } from "@/lib/errors";
import { requireInt, requireString } from "@/lib/validate";
import { reviewRepository } from "@/repositories/review.repository";
import { bookRepository } from "@/repositories/book.repository";

export const reviewService = {
  // One review per user per book; resubmitting edits in place (upsert).
  // The 1-5 range is validated here AND by the CHECK constraint in the
  // migration — validate early for a good error message, constrain in the
  // database so no code path can break the invariant.
  async submitReview(
    userId: string,
    input: { bookId: unknown; body: unknown; rating: unknown },
  ) {
    const bookId = requireString(input.bookId, "bookId", { min: 1 });
    const body = requireString(input.body, "body", { min: 1, max: 10_000 });
    const rating = requireInt(input.rating, "rating", { min: 1, max: 5 });

    const book = await bookRepository.findByIdWithAuthors(bookId);
    if (!book) throw new NotFoundError("Book not found");

    const [review] = await reviewRepository.upsertReviewWithRating(
      userId,
      bookId,
      body,
      rating,
    );
    return review;
  },
};

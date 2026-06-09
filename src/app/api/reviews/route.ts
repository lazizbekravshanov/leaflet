import { NextResponse } from "next/server";
import { apiHandler, readJson } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { reviewService } from "@/services/review.service";

// POST /api/reviews  { bookId, body, rating } — create or update (upsert)
// the caller's review + star rating for a book.
export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const body = await readJson(request);
  const review = await reviewService.submitReview(user.id, {
    bookId: body.bookId,
    body: body.body,
    rating: body.rating,
  });
  return NextResponse.json({ review }, { status: 201 });
});

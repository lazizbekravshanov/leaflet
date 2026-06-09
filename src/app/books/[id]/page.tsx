import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import { bookService } from "@/services/book.service";
import { shelfService } from "@/services/shelf.service";
import { BookCover } from "@/components/BookCover";
import { StarDisplay } from "@/components/StarDisplay";
import { ShelfPicker } from "@/components/ShelfPicker";
import { ReviewForm } from "@/components/ReviewForm";
import Link from "next/link";

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data;
  try {
    data = await bookService.getBookPage(id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const { book, stats, reviews } = data;

  const user = await getCurrentUser();
  const shelfType = user
    ? await shelfService.getShelfTypeForBook(user.id, book.id)
    : null;
  const myReview = user ? reviews.find((r) => r.userId === user.id) : undefined;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex gap-6">
        <BookCover coverId={book.coverId} title={book.title} size="L" />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">{book.title}</h1>
          <p className="text-neutral-500">
            {book.authors.map((ba) => ba.author.name).join(", ")}
            {book.publishedYear && ` · ${book.publishedYear}`}
            {book.pageCount && ` · ${book.pageCount} pages`}
          </p>
          <StarDisplay value={stats.average} count={stats.count} />
          {user ? (
            <div className="mt-2">
              <ShelfPicker
                bookId={book.id}
                current={
                  shelfType === "CUSTOM" ? null : shelfType
                }
              />
            </div>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">
              <Link href="/login" className="text-emerald-700 underline">
                Log in
              </Link>{" "}
              to shelve this book.
            </p>
          )}
        </div>
      </div>

      {book.description && (
        <p className="max-w-2xl whitespace-pre-line text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          {book.description}
        </p>
      )}

      {user && (
        <section className="max-w-2xl">
          <h2 className="mb-3 text-lg font-medium">
            {myReview ? "Your review" : "Write a review"}
          </h2>
          <ReviewForm
            bookId={book.id}
            initialBody={myReview?.body}
            initialRating={myReview?.rating ?? 0}
          />
        </section>
      )}

      <section className="max-w-2xl">
        <h2 className="mb-3 text-lg font-medium">
          Reviews ({reviews.length})
        </h2>
        <div className="flex flex-col gap-4">
          {reviews.length === 0 && (
            <p className="text-sm text-neutral-500">No reviews yet.</p>
          )}
          {reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="mb-1 flex items-center gap-2 text-sm">
                <span className="font-medium">@{review.user.username}</span>
                {review.rating !== null && (
                  <span className="text-amber-500">
                    {"★".repeat(review.rating)}
                  </span>
                )}
                <span className="text-neutral-400">
                  {review.createdAt.toLocaleDateString()}
                </span>
              </div>
              <p className="whitespace-pre-line text-sm">{review.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

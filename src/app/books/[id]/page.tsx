import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import { bookService } from "@/services/book.service";
import { shelfService } from "@/services/shelf.service";
import { BookCover } from "@/components/BookCover";
import { StarDisplay } from "@/components/StarDisplay";
import { ShelfPicker } from "@/components/ShelfPicker";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewCard } from "@/components/ReviewCard";
import Link from "next/link";

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  let data;
  try {
    data = await bookService.getBookPage(id, user?.id ?? null);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const { book, stats, reviews } = data;
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
              <Link href="/login" className="text-accent underline">
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
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={user?.id ?? null}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";
import { bookService } from "@/services/book.service";
import { shelfService } from "@/services/shelf.service";
import { BookCover } from "@/components/BookCover";
import { ShelfPicker } from "@/components/ShelfPicker";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewCard } from "@/components/ReviewCard";
import { Stars } from "@/components/icons";

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
    <div className="mx-auto max-w-[1080px] px-5 py-12">
      <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
        <div className="shrink-0">
          <BookCover coverId={book.coverId} title={book.title} size="L" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[28px] font-semibold md:text-[40px]">
            {book.title}
          </h1>
          <p className="mt-1.5 text-[17px] text-ink-secondary">
            {book.authors.map((ba) => ba.author.name).join(", ")}
            {book.publishedYear && ` · ${book.publishedYear}`}
            {book.pageCount && (
              <span className="tnum"> · {book.pageCount} pages</span>
            )}
          </p>
          <div className="mt-3 flex items-center gap-2.5 text-[15px] text-ink-secondary">
            {stats.average !== null ? (
              <>
                <Stars value={stats.average} />
                <span className="tnum">
                  {stats.average.toFixed(1)} · {stats.count} rating
                  {stats.count === 1 ? "" : "s"}
                </span>
              </>
            ) : (
              <span>No ratings yet</span>
            )}
          </div>
          <div className="mt-6">
            {user ? (
              <ShelfPicker
                bookId={book.id}
                current={shelfType === "CUSTOM" ? null : shelfType}
              />
            ) : (
              <p className="text-[15px] text-ink-secondary">
                <Link
                  href="/login"
                  className="text-ink underline underline-offset-2 hover:text-accent"
                >
                  Log in
                </Link>{" "}
                to shelve this book.
              </p>
            )}
          </div>
          {book.description && (
            <p className="mt-8 max-w-[640px] whitespace-pre-line text-[17px] leading-[1.6] text-ink-secondary">
              {book.description}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto mt-14 max-w-[640px] sm:mx-0">
        {user && (
          <section className="border-t border-line pt-8">
            <h2 className="font-display text-[21px] font-semibold">
              {myReview ? "Your review" : "Write a review"}
            </h2>
            <div className="mt-4">
              <ReviewForm
                bookId={book.id}
                initialBody={myReview?.body}
                initialRating={myReview?.rating ?? 0}
              />
            </div>
          </section>
        )}

        <section className="mt-12">
          <h2 className="font-display border-b border-line pb-3 text-[21px] font-semibold">
            Reviews <span className="tnum text-ink-secondary">{reviews.length}</span>
          </h2>
          <div className="divide-y divide-line">
            {reviews.length === 0 && (
              <p className="py-6 text-[15px] text-ink-secondary">
                No reviews yet.
              </p>
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
    </div>
  );
}

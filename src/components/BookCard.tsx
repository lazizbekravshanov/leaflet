import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { Stars } from "@/components/icons";
import type { BookSearchRow } from "@/repositories/book.repository";

// A search result row: hairline-ruled, not boxed.
export function BookCard({ book }: { book: BookSearchRow }) {
  return (
    <Link
      href={`/books/${book.id}`}
      className="group flex gap-4 border-t border-line pt-5"
    >
      <BookCover coverId={book.cover_id} title={book.title} size="S" />
      <div className="min-w-0">
        <h3 className="font-display truncate text-[17px] font-semibold transition-colors duration-150 group-hover:text-accent">
          {book.title}
        </h3>
        <p className="truncate text-[15px] text-ink-secondary">
          {book.authors ?? "Unknown author"}
          {book.published_year && ` · ${book.published_year}`}
        </p>
        <div className="mt-1.5 flex items-center gap-2 text-[13px] text-ink-secondary">
          {book.avg_rating !== null ? (
            <>
              <Stars value={book.avg_rating} />
              <span className="tnum">
                {book.avg_rating.toFixed(1)} · {book.rating_count}
              </span>
            </>
          ) : (
            <span>No ratings yet</span>
          )}
        </div>
      </div>
    </Link>
  );
}

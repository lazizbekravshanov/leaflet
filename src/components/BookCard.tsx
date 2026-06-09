import Link from "next/link";
import { BookCover } from "@/components/BookCover";
import { StarDisplay } from "@/components/StarDisplay";
import type { BookSearchRow } from "@/repositories/book.repository";

export function BookCard({ book }: { book: BookSearchRow }) {
  return (
    <Link
      href={`/books/${book.id}`}
      className="flex gap-4 rounded-lg border border-neutral-200 p-4 hover:border-accent dark:border-neutral-800"
    >
      <BookCover coverId={book.cover_id} title={book.title} size="S" />
      <div className="min-w-0">
        <h3 className="truncate font-medium">{book.title}</h3>
        <p className="truncate text-sm text-neutral-500">
          {book.authors ?? "Unknown author"}
          {book.published_year && ` · ${book.published_year}`}
        </p>
        <StarDisplay value={book.avg_rating} count={book.rating_count} />
      </div>
    </Link>
  );
}

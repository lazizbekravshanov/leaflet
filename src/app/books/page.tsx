import { SearchForm } from "@/components/SearchForm";
import { BookCard } from "@/components/BookCard";
import { bookService } from "@/services/book.service";

// Server component: the raw SQL search runs on the server during render and
// the page ships as HTML. searchParams is a Promise in Next 15.
export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const results = q ? await bookService.search(q) : [];

  return (
    <div className="flex flex-col gap-6">
      <SearchForm defaultValue={q ?? ""} />
      {q && (
        <p className="text-sm text-neutral-500">
          {results.length} result{results.length === 1 ? "" : "s"} for “{q}”
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {results.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
      {!q && (
        <p className="text-center text-sm text-neutral-500">
          Try “dune”, “orwell”, or “murakami” — the seed has 50 books.
        </p>
      )}
    </div>
  );
}

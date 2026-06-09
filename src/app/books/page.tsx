import { Suspense } from "react";
import { SearchForm } from "@/components/SearchForm";
import { BookCard } from "@/components/BookCard";
import { SearchResultsSkeleton } from "@/components/Skeletons";
import { bookService } from "@/services/book.service";

// Server component: the raw SQL search runs on the server during render and
// the page ships as HTML. searchParams is a Promise in Next 15.
export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <SearchForm defaultValue={q ?? ""} />
      {q ? (
        // key={q}: a NEW search re-suspends and shows the skeleton again
        // instead of keeping stale results on screen.
        <Suspense key={q} fallback={<SearchResultsSkeleton />}>
          <SearchResults q={q} />
        </Suspense>
      ) : (
        <p className="text-center text-sm text-neutral-500">
          Try “dune”, “orwell”, or “murakami” — the seed has 50 books.
        </p>
      )}
    </div>
  );
}

async function SearchResults({ q }: { q: string }) {
  const results = await bookService.search(q);

  return (
    <>
      <p className="text-sm text-neutral-500">
        {results.length} result{results.length === 1 ? "" : "s"} for “{q}”
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {results.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </>
  );
}

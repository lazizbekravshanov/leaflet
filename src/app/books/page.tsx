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
    <div className="mx-auto max-w-[1080px] px-5 py-12">
      <h1 className="font-display text-[28px] font-semibold">Browse</h1>
      <div className="mt-6">
        <SearchForm defaultValue={q ?? ""} />
      </div>
      <div className="mt-8">
        {q ? (
          // key={q}: a NEW search re-suspends and shows the skeleton again
          // instead of keeping stale results on screen.
          <Suspense key={q} fallback={<SearchResultsSkeleton />}>
            <SearchResults q={q} />
          </Suspense>
        ) : (
          <p className="text-[15px] text-ink-secondary">
            Search the catalog by title or author.
          </p>
        )}
      </div>
    </div>
  );
}

async function SearchResults({ q }: { q: string }) {
  const results = await bookService.search(q);

  return (
    <>
      <p className="tnum text-[13px] text-ink-secondary">
        {results.length} result{results.length === 1 ? "" : "s"} for “{q}”
      </p>
      <div className="mt-4 grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {results.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </>
  );
}

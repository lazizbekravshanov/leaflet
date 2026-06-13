import Link from "next/link";

// Server-rendered prev/next for OFFSET-paginated lists (Phase 1). URL-driven
// (?page=N) so pages are linkable and the back button works, no client state.
// hasMore comes from the limit+1 fetch, so "Next" only shows when a next page
// exists — no count query needed.
export function Pager({
  page,
  hasMore,
  hrefFor,
  labels = { prev: "Previous", next: "Next" },
}: {
  page: number;
  hasMore: boolean;
  hrefFor: (page: number) => string;
  labels?: { prev: string; next: string };
}) {
  if (page === 0 && !hasMore) return null;
  return (
    <nav className="mt-8 flex items-center justify-between border-t border-line pt-5 text-[15px]">
      {page > 0 ? (
        <Link href={hrefFor(page - 1)} className="nav-link">
          ← {labels.prev}
        </Link>
      ) : (
        <span aria-hidden />
      )}
      <span className="tnum text-[13px] text-ink-secondary">Page {page + 1}</span>
      {hasMore ? (
        <Link href={hrefFor(page + 1)} className="nav-link">
          {labels.next} →
        </Link>
      ) : (
        <span aria-hidden />
      )}
    </nav>
  );
}

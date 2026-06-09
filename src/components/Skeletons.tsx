// Loading skeletons, used as <Suspense> fallbacks INSIDE pages rather than as
// segment-level loading.tsx files. Why: a loading.tsx wraps its whole subtree
// in a Suspense boundary, which makes Next start streaming a 200 response
// before the page resolves — so notFound() pages and redirect() pages would
// ship status 200. Scoping Suspense to just the slow part keeps real HTTP
// semantics (404s are 404s) AND gives instant visual feedback.

export function FeedSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex gap-4 rounded-lg border border-ink/10 p-4">
          <div className="h-[4.5rem] w-12 rounded bg-ink/10" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-2/3 rounded bg-ink/10" />
            <div className="h-3 w-1/4 rounded bg-ink/10" />
            <div className="h-3 w-full rounded bg-ink/10" />
            <div className="h-3 w-5/6 rounded bg-ink/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SearchResultsSkeleton() {
  return (
    <div className="grid animate-pulse gap-3 sm:grid-cols-2">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex gap-4 rounded-lg border border-ink/10 p-4">
          <div className="h-[4.5rem] w-12 rounded bg-ink/10" />
          <div className="flex flex-1 flex-col gap-2 py-1">
            <div className="h-4 w-3/4 rounded bg-ink/10" />
            <div className="h-3 w-1/2 rounded bg-ink/10" />
            <div className="h-3 w-1/3 rounded bg-ink/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

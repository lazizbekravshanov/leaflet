// Loading skeletons, used as <Suspense> fallbacks INSIDE pages rather than as
// segment-level loading.tsx files. Why: a loading.tsx wraps its whole subtree
// in a Suspense boundary, which makes Next start streaming a 200 response
// before the page resolves — so notFound() pages and redirect() pages would
// ship status 200. Scoping Suspense to just the slow part keeps real HTTP
// semantics (404s are 404s) AND gives instant visual feedback.

export function FeedSkeleton() {
  return (
    <div className="divide-y divide-line" aria-hidden>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="animate-pulse py-7">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-bg-subtle" />
            <div className="h-3 w-44 rounded-control bg-bg-subtle" />
          </div>
          <div className="mt-4 flex gap-5">
            <div className="aspect-2/3 w-16 rounded-card bg-bg-subtle" />
            <div className="flex flex-1 flex-col gap-2 py-1">
              <div className="h-5 w-1/2 rounded-control bg-bg-subtle" />
              <div className="h-3.5 w-1/3 rounded-control bg-bg-subtle" />
              <div className="mt-2 h-3.5 w-full rounded-control bg-bg-subtle" />
              <div className="h-3.5 w-5/6 rounded-control bg-bg-subtle" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SearchResultsSkeleton() {
  return (
    <div className="grid animate-pulse gap-x-8 gap-y-6 sm:grid-cols-2" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex gap-4 border-t border-line pt-5">
          <div className="aspect-2/3 w-12 rounded-card bg-bg-subtle" />
          <div className="flex flex-1 flex-col gap-2 py-1">
            <div className="h-4 w-3/4 rounded-control bg-bg-subtle" />
            <div className="h-3 w-1/2 rounded-control bg-bg-subtle" />
          </div>
        </div>
      ))}
    </div>
  );
}

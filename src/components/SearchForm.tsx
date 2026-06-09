// Plain HTML form, no client JS: GET /books?q=term is just a navigation.
// Search state living in the URL means results are linkable and the back
// button works — a small lesson in not reaching for useState by default.
export function SearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/books" className="flex w-full max-w-md gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search books or authors…"
        className="flex-1 rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
      />
      <button
        type="submit"
        className="rounded bg-accent px-4 py-2 text-white hover:bg-accent-deep"
      >
        Search
      </button>
    </form>
  );
}

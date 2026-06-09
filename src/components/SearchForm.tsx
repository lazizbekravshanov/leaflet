// Plain HTML form, no client JS: GET /books?q=term is just a navigation.
// Search state living in the URL means results are linkable and the back
// button works.
export function SearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/books" className="flex w-full max-w-[480px] gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search books or authors"
        aria-label="Search books or authors"
        className="flex-1 rounded-control bg-bg-subtle px-3.5 py-2.5 text-[15px] placeholder:text-ink-tertiary"
      />
      <button
        type="submit"
        className="rounded-control bg-accent px-4 py-2.5 text-[15px] font-medium text-white transition-colors duration-150 hover:bg-accent-hover"
      >
        Search
      </button>
    </form>
  );
}

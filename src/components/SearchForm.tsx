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
        className="field flex-1"
      />
      <button type="submit" className="btn btn-primary">
        Search
      </button>
    </form>
  );
}

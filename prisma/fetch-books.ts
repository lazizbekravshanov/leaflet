// One-time helper: fetches 50 well-known books from the Open Library API and
// writes prisma/seed-data/books.json. The JSON is COMMITTED, so `db:seed`
// itself never touches the network (deterministic, works offline, works in CI).
// Re-run with `npm run db:fetch-books` only if you want to refresh the data.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const TITLES: Array<{
  title: string;
  author: string;
  genres: string[];
  // When the display title differs from the work's title on Open Library
  // (e.g. "1984" is catalogued as "Nineteen Eighty-Four").
  searchTitle?: string;
  // Last resort for works heuristics can't disambiguate (translations,
  // titles shared with study guides): pin the exact OL work key.
  workKey?: string;
}> = [
  { title: "1984", author: "George Orwell", searchTitle: "Nineteen Eighty-Four", genres: ["classics", "dystopian", "sci-fi"] },
  { title: "Animal Farm", author: "George Orwell", genres: ["classics", "satire", "political"] },
  { title: "Brave New World", author: "Aldous Huxley", genres: ["classics", "dystopian", "sci-fi"] },
  { title: "Fahrenheit 451", author: "Ray Bradbury", genres: ["classics", "dystopian", "sci-fi"] },
  { title: "To Kill a Mockingbird", author: "Harper Lee", genres: ["classics", "literary", "historical"] },
  { title: "Pride and Prejudice", author: "Jane Austen", genres: ["classics", "romance", "literary"] },
  { title: "Jane Eyre", author: "Charlotte Brontë", genres: ["classics", "romance", "gothic"] },
  { title: "Wuthering Heights", author: "Emily Brontë", genres: ["classics", "romance", "gothic"] },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", genres: ["classics", "literary"] },
  { title: "Moby Dick", author: "Herman Melville", genres: ["classics", "adventure", "literary"] },
  { title: "War and Peace", author: "Leo Tolstoy", genres: ["classics", "historical", "literary"] },
  { title: "Anna Karenina", author: "Leo Tolstoy", genres: ["classics", "romance", "literary"] },
  { title: "Crime and Punishment", author: "Fyodor Dostoevsky", genres: ["classics", "literary", "psychological"] },
  { title: "The Brothers Karamazov", author: "Fyodor Dostoevsky", genres: ["classics", "literary", "philosophy"] },
  { title: "One Hundred Years of Solitude", author: "Gabriel García Márquez", genres: ["literary", "magical-realism", "classics"] },
  { title: "Love in the Time of Cholera", author: "Gabriel García Márquez", genres: ["literary", "romance", "magical-realism"] },
  { title: "Beloved", author: "Toni Morrison", genres: ["literary", "historical", "classics"] },
  { title: "The Color Purple", author: "Alice Walker", genres: ["literary", "historical", "classics"] },
  { title: "Catch-22", author: "Joseph Heller", genres: ["classics", "satire", "war"] },
  { title: "Slaughterhouse-Five", author: "Kurt Vonnegut", genres: ["classics", "sci-fi", "satire"] },
  { title: "The Catcher in the Rye", author: "J. D. Salinger", genres: ["classics", "literary", "coming-of-age"] },
  { title: "Of Mice and Men", author: "John Steinbeck", genres: ["classics", "literary"] },
  { title: "The Grapes of Wrath", author: "John Steinbeck", genres: ["classics", "literary", "historical"] },
  { title: "East of Eden", author: "John Steinbeck", genres: ["classics", "literary", "family-saga"] },
  { title: "Lord of the Flies", author: "William Golding", genres: ["classics", "literary", "dystopian"] },
  { title: "The Hobbit", author: "J. R. R. Tolkien", genres: ["fantasy", "classics", "adventure"] },
  { title: "The Fellowship of the Ring", author: "J. R. R. Tolkien", genres: ["fantasy", "classics", "adventure"] },
  { title: "Harry Potter and the Philosopher's Stone", author: "J. K. Rowling", genres: ["fantasy", "young-adult"] },
  { title: "A Game of Thrones", author: "George R. R. Martin", genres: ["fantasy", "epic"] },
  { title: "The Name of the Wind", author: "Patrick Rothfuss", genres: ["fantasy", "epic"] },
  { title: "Dune", author: "Frank Herbert", genres: ["sci-fi", "classics", "epic"] },
  { title: "Foundation", author: "Isaac Asimov", genres: ["sci-fi", "classics"] },
  { title: "Neuromancer", author: "William Gibson", genres: ["sci-fi", "cyberpunk"] },
  { title: "Snow Crash", author: "Neal Stephenson", genres: ["sci-fi", "cyberpunk"] },
  { title: "The Left Hand of Darkness", author: "Ursula K. Le Guin", genres: ["sci-fi", "literary"] },
  { title: "The Hitchhiker's Guide to the Galaxy", author: "Douglas Adams", searchTitle: "The Hitch Hiker's Guide to the Galaxy", workKey: "OL2163649W", genres: ["sci-fi", "comedy"] },
  { title: "Ender's Game", author: "Orson Scott Card", genres: ["sci-fi", "young-adult"] },
  { title: "The Martian", author: "Andy Weir", genres: ["sci-fi", "thriller"] },
  { title: "Project Hail Mary", author: "Andy Weir", genres: ["sci-fi", "thriller"] },
  { title: "Kafka on the Shore", author: "Haruki Murakami", genres: ["literary", "magical-realism"] },
  { title: "Norwegian Wood", author: "Haruki Murakami", genres: ["literary", "romance"] },
  { title: "The Wind-Up Bird Chronicle", author: "Haruki Murakami", searchTitle: "wind-up bird chronicle", workKey: "OL2625412W", genres: ["literary", "magical-realism"] },
  { title: "The Road", author: "Cormac McCarthy", genres: ["literary", "dystopian", "post-apocalyptic"] },
  { title: "No Country for Old Men", author: "Cormac McCarthy", genres: ["literary", "thriller", "western"] },
  { title: "Gone Girl", author: "Gillian Flynn", genres: ["thriller", "mystery"] },
  { title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson", genres: ["thriller", "mystery", "crime"] },
  { title: "The Remains of the Day", author: "Kazuo Ishiguro", genres: ["literary", "historical"] },
  { title: "Never Let Me Go", author: "Kazuo Ishiguro", genres: ["literary", "sci-fi", "dystopian"] },
  { title: "Sapiens", author: "Yuval Noah Harari", genres: ["nonfiction", "history", "science"] },
  { title: "Educated", author: "Tara Westover", genres: ["nonfiction", "memoir"] },
];

type SearchDoc = {
  key: string; // "/works/OL893415W"
  title: string;
  author_key?: string[];
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  number_of_pages_median?: number;
  isbn?: string[];
  edition_count?: number;
};

// Open Library relevance ranking is unstable — the top hit is sometimes a
// graded-reader "adaptation", an omnibus, or a translation's work record.
// So: take 10 candidates, prefer an exact (normalized) title match, and
// break ties with edition_count — the canonical work is almost always the
// most-published one.
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function pickBest(
  docs: SearchDoc[],
  wantedTitle: string,
  wantedAuthor: string,
): SearchDoc | undefined {
  // Require the author to match first — this drops study guides and
  // adaptations credited to someone else. Surname only, so "J. R. R.
  // Tolkien" still matches "J.R.R. Tolkien".
  const surname = normalize(wantedAuthor).split(" ").at(-1) ?? "";
  const byAuthor = docs.filter((d) =>
    d.author_name?.some((n) => normalize(n).includes(surname)),
  );
  const pool = byAuthor.length > 0 ? byAuthor : docs;

  const wanted = normalize(wantedTitle);
  const exact = pool.filter((d) => normalize(d.title) === wanted);
  return (exact.length > 0 ? exact : pool).toSorted(
    (a, b) => (b.edition_count ?? 0) - (a.edition_count ?? 0),
  )[0];
}

export type SeedBook = {
  openLibraryId: string;
  title: string;
  description: string | null;
  coverId: number | null;
  isbn: string | null;
  genres: string[];
  publishedYear: number | null;
  pageCount: number | null;
  authors: Array<{ openLibraryId: string | null; name: string }>;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": "leaflet-seed-script (learning project)" },
  });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json() as Promise<T>;
}

async function fetchDescription(workKey: string): Promise<string | null> {
  try {
    const work = await getJson<{ description?: string | { value: string } }>(
      `https://openlibrary.org${workKey}.json`,
    );
    const d = work.description;
    const text = typeof d === "string" ? d : (d?.value ?? null);
    return text ? text.slice(0, 800) : null;
  } catch {
    return null; // description is nice-to-have, not worth failing the run
  }
}

async function main() {
  const books: SeedBook[] = [];

  const fields =
    "key,title,author_key,author_name,cover_i,first_publish_year,number_of_pages_median,isbn,edition_count";

  for (const { title, author, genres, searchTitle, workKey } of TITLES) {
    const query = searchTitle ?? title;
    const params = new URLSearchParams({ title: query, author, fields, limit: "10" });
    let result = await getJson<{ docs: SearchDoc[] }>(
      `https://openlibrary.org/search.json?${params}`,
    );
    const wantedKey = workKey ? `/works/${workKey}` : null;
    const misses = (docs: SearchDoc[]) =>
      docs.length === 0 || (wantedKey !== null && !docs.some((d) => d.key === wantedKey));
    if (misses(result.docs)) {
      // Structured title+author search misses some translated works; fall
      // back to a general query.
      const fallback = new URLSearchParams({
        // For pinned works, the author's name may only exist in the original
        // script — adding the Latin name to the query would exclude the work.
        q: wantedKey ? query : `${query} ${author}`,
        fields,
        limit: "10",
      });
      result = await getJson<{ docs: SearchDoc[] }>(
        `https://openlibrary.org/search.json?${fallback}`,
      );
    }
    const doc = wantedKey
      ? result.docs.find((d) => d.key === wantedKey)
      : pickBest(result.docs, query, author);
    if (!doc) {
      console.warn(`SKIP (no result): ${title}`);
      continue;
    }

    books.push({
      openLibraryId: doc.key.replace("/works/", ""),
      // Our curated list is the display title; the doc title may be the
      // original language ("海辺のカフカ" for Kafka on the Shore).
      title,
      description: await fetchDescription(doc.key),
      coverId: doc.cover_i ?? null,
      // Prefer an ISBN-13 (the modern standard); fall back to any.
      isbn: doc.isbn?.find((i) => /^\d{13}$/.test(i)) ?? doc.isbn?.[0] ?? null,
      genres,
      publishedYear: doc.first_publish_year ?? null,
      pageCount: doc.number_of_pages_median ?? null,
      authors: (doc.author_name ?? [author]).map((name, i) => ({
        openLibraryId: doc.author_key?.[i] ?? null,
        // Some works carry the author's original-script name (村上春樹);
        // use our curated Latin name for the primary author in that case.
        name: i === 0 && !/[a-z]/i.test(name) ? author : name,
      })),
    });
    console.log(`ok: ${doc.title}`);
    await new Promise((r) => setTimeout(r, 300)); // be polite to the public API
  }

  const outDir = path.join(import.meta.dirname, "seed-data");
  await mkdir(outDir, { recursive: true });
  await writeFile(
    path.join(outDir, "books.json"),
    JSON.stringify(books, null, 2),
  );
  console.log(`\nWrote ${books.length} books to prisma/seed-data/books.json`);
}

main();

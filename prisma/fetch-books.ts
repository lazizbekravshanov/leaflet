// One-time helper: fetches 50 well-known books from the Open Library API and
// writes prisma/seed-data/books.json. The JSON is COMMITTED, so `db:seed`
// itself never touches the network (deterministic, works offline, works in CI).
// Re-run with `npm run db:fetch-books` only if you want to refresh the data.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const TITLES: Array<{ title: string; author: string }> = [
  { title: "1984", author: "George Orwell" },
  { title: "Animal Farm", author: "George Orwell" },
  { title: "Brave New World", author: "Aldous Huxley" },
  { title: "Fahrenheit 451", author: "Ray Bradbury" },
  { title: "To Kill a Mockingbird", author: "Harper Lee" },
  { title: "Pride and Prejudice", author: "Jane Austen" },
  { title: "Jane Eyre", author: "Charlotte Brontë" },
  { title: "Wuthering Heights", author: "Emily Brontë" },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald" },
  { title: "Moby Dick", author: "Herman Melville" },
  { title: "War and Peace", author: "Leo Tolstoy" },
  { title: "Anna Karenina", author: "Leo Tolstoy" },
  { title: "Crime and Punishment", author: "Fyodor Dostoevsky" },
  { title: "The Brothers Karamazov", author: "Fyodor Dostoevsky" },
  { title: "One Hundred Years of Solitude", author: "Gabriel García Márquez" },
  { title: "Love in the Time of Cholera", author: "Gabriel García Márquez" },
  { title: "Beloved", author: "Toni Morrison" },
  { title: "The Color Purple", author: "Alice Walker" },
  { title: "Catch-22", author: "Joseph Heller" },
  { title: "Slaughterhouse-Five", author: "Kurt Vonnegut" },
  { title: "The Catcher in the Rye", author: "J. D. Salinger" },
  { title: "Of Mice and Men", author: "John Steinbeck" },
  { title: "The Grapes of Wrath", author: "John Steinbeck" },
  { title: "East of Eden", author: "John Steinbeck" },
  { title: "Lord of the Flies", author: "William Golding" },
  { title: "The Hobbit", author: "J. R. R. Tolkien" },
  { title: "The Fellowship of the Ring", author: "J. R. R. Tolkien" },
  { title: "Harry Potter and the Philosopher's Stone", author: "J. K. Rowling" },
  { title: "A Game of Thrones", author: "George R. R. Martin" },
  { title: "The Name of the Wind", author: "Patrick Rothfuss" },
  { title: "Dune", author: "Frank Herbert" },
  { title: "Foundation", author: "Isaac Asimov" },
  { title: "Neuromancer", author: "William Gibson" },
  { title: "Snow Crash", author: "Neal Stephenson" },
  { title: "The Left Hand of Darkness", author: "Ursula K. Le Guin" },
  { title: "The Hitchhiker's Guide to the Galaxy", author: "Douglas Adams" },
  { title: "Ender's Game", author: "Orson Scott Card" },
  { title: "The Martian", author: "Andy Weir" },
  { title: "Project Hail Mary", author: "Andy Weir" },
  { title: "Kafka on the Shore", author: "Haruki Murakami" },
  { title: "Norwegian Wood", author: "Haruki Murakami" },
  { title: "The Wind-Up Bird Chronicle", author: "Haruki Murakami" },
  { title: "The Road", author: "Cormac McCarthy" },
  { title: "No Country for Old Men", author: "Cormac McCarthy" },
  { title: "Gone Girl", author: "Gillian Flynn" },
  { title: "The Girl with the Dragon Tattoo", author: "Stieg Larsson" },
  { title: "The Remains of the Day", author: "Kazuo Ishiguro" },
  { title: "Never Let Me Go", author: "Kazuo Ishiguro" },
  { title: "Sapiens", author: "Yuval Noah Harari" },
  { title: "Educated", author: "Tara Westover" },
];

type SearchDoc = {
  key: string; // "/works/OL893415W"
  title: string;
  author_key?: string[];
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  number_of_pages_median?: number;
};

export type SeedBook = {
  openLibraryId: string;
  title: string;
  description: string | null;
  coverId: number | null;
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
    "key,title,author_key,author_name,cover_i,first_publish_year,number_of_pages_median";

  for (const { title, author } of TITLES) {
    const params = new URLSearchParams({ title, author, fields, limit: "1" });
    let result = await getJson<{ docs: SearchDoc[] }>(
      `https://openlibrary.org/search.json?${params}`,
    );
    if (result.docs.length === 0) {
      // Structured title+author search misses some translated works; fall
      // back to a general query.
      const fallback = new URLSearchParams({
        q: `${title} ${author}`,
        fields,
        limit: "1",
      });
      result = await getJson<{ docs: SearchDoc[] }>(
        `https://openlibrary.org/search.json?${fallback}`,
      );
    }
    const doc = result.docs[0];
    if (!doc) {
      console.warn(`SKIP (no result): ${title}`);
      continue;
    }

    books.push({
      openLibraryId: doc.key.replace("/works/", ""),
      title: doc.title,
      description: await fetchDescription(doc.key),
      coverId: doc.cover_i ?? null,
      publishedYear: doc.first_publish_year ?? null,
      pageCount: doc.number_of_pages_median ?? null,
      authors: (doc.author_name ?? [author]).map((name, i) => ({
        openLibraryId: doc.author_key?.[i] ?? null,
        name,
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

// Seeds the database from the committed Open Library snapshot
// (seed-data/books.json — see fetch-books.ts for how it was produced).
// Run via `npm run db:seed`. Idempotent: every write is an upsert keyed on
// the Open Library id, so re-running updates rather than duplicates.
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { SeedBook } from "./fetch-books";
import { seedDemo } from "./seed-demo";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const raw = await readFile(
    path.join(import.meta.dirname, "seed-data", "books.json"),
    "utf8",
  );
  const books = JSON.parse(raw) as SeedBook[];

  for (const entry of books) {
    // Authors first (a book row needs author ids to link to). Authors are
    // shared across books — Tolstoy appears twice — which is exactly why
    // they're a separate table and not a column on books.
    const authorIds: string[] = [];
    for (const author of entry.authors) {
      const record = author.openLibraryId
        ? await prisma.author.upsert({
            where: { openLibraryId: author.openLibraryId },
            create: { openLibraryId: author.openLibraryId, name: author.name },
            update: { name: author.name },
          })
        : await prisma.author.create({ data: { name: author.name } });
      authorIds.push(record.id);
    }

    // Denormalized author names for the FTS generated column (Phase 4). Set
    // here because the generated search_vector can't reach the authors table,
    // and book authorship is only ever written at seed time.
    const authorsText = entry.authors.map((a) => a.name).join(", ");

    await prisma.book.upsert({
      where: { openLibraryId: entry.openLibraryId },
      create: {
        openLibraryId: entry.openLibraryId,
        title: entry.title,
        description: entry.description,
        coverId: entry.coverId,
        isbn: entry.isbn,
        genres: entry.genres,
        publishedYear: entry.publishedYear,
        pageCount: entry.pageCount,
        authorsText,
        authors: {
          create: authorIds.map((authorId, position) => ({ authorId, position })),
        },
      },
      update: {
        title: entry.title,
        description: entry.description,
        coverId: entry.coverId,
        isbn: entry.isbn,
        genres: entry.genres,
        publishedYear: entry.publishedYear,
        pageCount: entry.pageCount,
        authorsText,
      },
    });
  }

  const count = await prisma.book.count();
  console.log(`Seeded. books in db: ${count}`);

  // Demo users/reviews/follows so the feed is alive on first run.
  const allBooks = await prisma.book.findMany({
    select: { id: true },
    orderBy: { title: "asc" }, // stable order keeps the demo deterministic
  });
  await seedDemo(prisma, allBooks.map((b) => b.id));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

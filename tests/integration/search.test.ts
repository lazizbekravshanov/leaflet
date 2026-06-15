import { randomUUID } from "node:crypto";
import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { bookRepository } from "@/repositories/book.repository";
import { createBook } from "../helpers";

afterAll(async () => {
  await prisma.$disconnect();
});

// A unique, single-lexeme nonsense word (no underscore) so a search for it is
// isolated from seed/other-test books.
const word = (p: string) => p + randomUUID().replace(/-/g, "").slice(0, 12);

describe("full-text search (Phase 4)", () => {
  it("stems: a search for 'run' matches a title with 'running'", async () => {
    const tok = word("zt");
    await createBook({ title: `${tok} running` });

    // websearch ANDs the terms: the unique tok isolates to my book, and 'run'
    // must match 'running' via the English stemmer for this to return it.
    const res = await bookRepository.search(`${tok} run`, 20);
    expect(res).toHaveLength(1);
    expect(res[0]!.title).toContain(tok);
  });

  it("trigram fallback: a typo with no FTS match still finds the book", async () => {
    const tok = word("zq");
    await createBook({ title: tok });

    // exact FTS hit
    expect((await bookRepository.search(tok, 20)).some((r) => r.title === tok)).toBe(true);

    // one-character deletion: not a stem, so FTS returns nothing and the
    // pg_trgm similarity fallback is what surfaces it.
    const typo = tok.slice(0, 6) + tok.slice(7);
    const res = await bookRepository.search(typo, 20);
    expect(res.some((r) => r.title === tok)).toBe(true);
  });

  it("reads the denormalized rating columns (no per-row aggregate)", async () => {
    const tok = word("zr");
    const book = await createBook({ title: tok });
    // freshly created, unrated → cache columns are null/0
    const res = await bookRepository.search(tok, 20);
    const found = res.find((r) => r.id === book.id)!;
    expect(found.avg_rating).toBeNull();
    expect(found.rating_count).toBe(0);
  });
});

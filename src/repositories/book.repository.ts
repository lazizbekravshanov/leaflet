import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

// Search returns a flat, display-ready row — deliberately shaped by SQL, not
// assembled in JS. Run the query in psql with EXPLAIN ANALYZE and study it.
export type BookSearchRow = {
  id: string;
  title: string;
  cover_id: number | null;
  published_year: number | null;
  authors: string | null;
  avg_rating: number | null;
  rating_count: number;
};

// The display projection, shared by the FTS and trigram-fallback queries.
// avg_rating/rating_count read the denormalized columns (Phase 5 cache) — no
// per-result-row AVG/COUNT subquery over `ratings` anymore. authors stays a
// per-row subquery (bounded by LIMIT; authors_text exists but the ordered,
// comma-joined display string is what the UI wants).
const SEARCH_COLUMNS = Prisma.sql`
  b.id,
  b.title,
  b.cover_id,
  b.published_year,
  (SELECT string_agg(a.name, ', ' ORDER BY ba.position)
     FROM book_authors ba JOIN authors a ON a.id = ba.author_id
    WHERE ba.book_id = b.id)                                AS authors,
  b.avg_rating,
  b.rating_count
`;

export const bookRepository = {
  // Full-text search (Phase 4). Raw SQL on purpose — this is THE query to
  // EXPLAIN. The shape:
  //
  // - PRIMARY: `search_vector @@ websearch_to_tsquery('english', term)`, served
  //   by the GIN index (Bitmap Index Scan, not the old ILIKE Seq Scan), ranked
  //   by ts_rank (title weight A > authors B > description C), rating_count as
  //   tiebreaker. websearch_to_tsquery takes natural input — quotes, OR,
  //   -negation — without us parsing it.
  // - PREFIX (autocomplete): for a plain word-only query we OR-in a prefix
  //   match of the trailing token (`tok:*`) so "dun" matches "Dune" mid-type.
  //   Skipped when the input uses FTS operators, so we don't fight websearch's
  //   own parsing.
  // - FALLBACK: FTS matches stems, not typos ("runing" stems to nothing). Only
  //   when FTS finds NOTHING do we run a second pg_trgm similarity query
  //   (`title % term`), served by the trigram GIN — the hybrid that gives us
  //   both language-aware ranking AND typo tolerance. Two round-trips only on
  //   the rare empty-FTS path.
  async search(term: string, limit: number): Promise<BookSearchRow[]> {
    // Prefix matching is an autocomplete aid for a SINGLE partial word ("dun"
    // -> "Dune"). Restrict it to a lone letters/digits token: OR-ing a prefix
    // into a multi-word query broadens the AND ("frank herbert" would also
    // match "herbert:*") and can rank a junk hit above the precise one. Quoted
    // / operator input is also excluded (it isn't a single bare token).
    const tokens = term.trim().split(/\s+/);
    const prefixLexeme =
      tokens.length === 1 && /^[\p{L}\p{N}]+$/u.test(tokens[0] ?? "")
        ? tokens[0]!.toLowerCase()
        : "";

    const tsquery =
      prefixLexeme.length > 0
        ? Prisma.sql`(websearch_to_tsquery('english', ${term}) || to_tsquery('english', ${prefixLexeme + ":*"}))`
        : Prisma.sql`websearch_to_tsquery('english', ${term})`;

    const hits = await prisma.$queryRaw<BookSearchRow[]>`
      SELECT ${SEARCH_COLUMNS}
        FROM books b
       WHERE b.search_vector @@ ${tsquery}
       ORDER BY ts_rank(b.search_vector, ${tsquery}) DESC,
                rating_count DESC,
                b.title ASC
       LIMIT ${limit}
    `;
    if (hits.length > 0) return hits;

    // Typo-tolerant fallback: trigram similarity (% uses the pg_trgm GIN and
    // the 0.3 default threshold). Ordered by best similarity across title/author.
    return prisma.$queryRaw<BookSearchRow[]>`
      SELECT ${SEARCH_COLUMNS}
        FROM books b
       WHERE b.title % ${term} OR b.authors_text % ${term}
       ORDER BY GREATEST(
                  similarity(b.title, ${term}),
                  similarity(COALESCE(b.authors_text, ''), ${term})
                ) DESC,
                rating_count DESC
       LIMIT ${limit}
    `;
  },

  findByIdWithAuthors(id: string) {
    return prisma.book.findUnique({
      where: { id },
      include: {
        authors: {
          include: { author: true },
          orderBy: { position: "asc" },
        },
      },
    });
  },

  // Reads the denormalized aggregate (Phase 5 cache) off the book row instead
  // of running AVG/COUNT over `ratings` on every book-page view. Maintained in
  // the same transaction as each rating write (see reviewRepository).
  async getRatingStats(bookId: string) {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { avgRating: true, ratingCount: true },
    });
    return { average: book?.avgRating ?? null, count: book?.ratingCount ?? 0 };
  },
};

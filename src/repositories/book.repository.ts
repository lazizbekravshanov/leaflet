import { prisma } from "@/lib/db";

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

export const bookRepository = {
  // Raw SQL on purpose (see project constraint): this is the query whose plan
  // you should study. Notes:
  //
  // - $queryRaw is a TAGGED TEMPLATE: every ${...} becomes a bind parameter
  //   ($1, $2...), never string concatenation — that's the SQL-injection
  //   safety line. $queryRawUnsafe with interpolation is the dangerous one.
  //
  // - title ILIKE '%term%' can't use a B-tree (leading wildcard), so the
  //   migration created a pg_trgm GIN index. EXPLAIN should show a Bitmap
  //   Index Scan on books_title_trgm once the table is big enough — on 50
  //   rows the planner will correctly prefer a Seq Scan. Seed more rows and
  //   watch the plan flip.
  //
  // - The scalar subqueries (authors, avg, count) run per RESULT row — fine
  //   for a LIMIT 20 search page, wrong for unbounded result sets. The
  //   alternative (LEFT JOIN + GROUP BY) aggregates before LIMIT. Compare
  //   both plans; this tradeoff returns at every scale.
  //
  // - Casts matter at the driver boundary: COUNT(*) is bigint (JS BigInt),
  //   AVG() is numeric (arbitrary precision, arrives as string/Decimal).
  //   ::int and ::float8 make rows plain JS numbers.
  search(term: string, limit: number): Promise<BookSearchRow[]> {
    return prisma.$queryRaw<BookSearchRow[]>`
      SELECT b.id,
             b.title,
             b.cover_id,
             b.published_year,
             (SELECT string_agg(a.name, ', ' ORDER BY ba.position)
                FROM book_authors ba
                JOIN authors a ON a.id = ba.author_id
               WHERE ba.book_id = b.id)                                AS authors,
             (SELECT AVG(r.value)::float8
                FROM ratings r WHERE r.book_id = b.id)                 AS avg_rating,
             (SELECT COUNT(*)::int
                FROM ratings r WHERE r.book_id = b.id)                 AS rating_count
        FROM books b
       WHERE b.title ILIKE '%' || ${term} || '%'
          OR EXISTS (SELECT 1
                       FROM book_authors ba
                       JOIN authors a ON a.id = ba.author_id
                      WHERE ba.book_id = b.id
                        AND a.name ILIKE '%' || ${term} || '%')
       ORDER BY rating_count DESC, b.title ASC
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

  // Aggregate over the narrow ratings table — this is the payoff of keeping
  // Rating separate from Review (see schema.prisma).
  async getRatingStats(bookId: string) {
    const agg = await prisma.rating.aggregate({
      where: { bookId },
      _avg: { value: true },
      _count: true,
    });
    return { average: agg._avg.value, count: agg._count };
  },
};

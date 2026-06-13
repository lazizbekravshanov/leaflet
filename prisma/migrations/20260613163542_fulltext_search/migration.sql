-- Phase 4: full-text search. Adds a denormalized authors_text column, a
-- GENERATED STORED tsvector over title+authors_text+description, a GIN index
-- for FTS, and pg_trgm GIN indexes for the typo-tolerant fallback (which also
-- restores the trigram indexes an earlier migration dropped — issue #1).
-- Runs in the migration's transaction; order matters (backfill authors_text
-- BEFORE the generated column computes its initial value from it).

-- pg_trgm backs the trigram fallback indexes below.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Denormalized author names, then backfill from the join. Books/authors have
--    no user-edit path, so this is maintained at seed time, not on a hot path.
ALTER TABLE "books" ADD COLUMN "authors_text" TEXT;

UPDATE "books" b
   SET "authors_text" = j.names
  FROM (
    SELECT ba."book_id", string_agg(au."name", ', ' ORDER BY ba."position") AS names
      FROM "book_authors" ba
      JOIN "authors" au ON au."id" = ba."author_id"
     GROUP BY ba."book_id"
  ) j
 WHERE j."book_id" = b."id";

-- 2. Generated, STORED full-text vector. Weighted setweight(): title 'A',
--    authors 'B', description 'C' — so a title hit outranks a description hit
--    under ts_rank. Computed for every existing row now (authors_text is
--    already populated) and recomputed automatically on any row change — no
--    trigger to write or keep correct.
ALTER TABLE "books" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("authors_text", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'C')
  ) STORED;

-- 3. Indexes. FTS GIN on the vector is the primary search path; the two
--    pg_trgm GINs power the typo-tolerant fallback (and fix issue #1).
CREATE INDEX "books_search_vector_idx" ON "books" USING GIN ("search_vector");
CREATE INDEX "books_title_trgm" ON "books" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "books_authors_text_trgm" ON "books" USING GIN ("authors_text" gin_trgm_ops);

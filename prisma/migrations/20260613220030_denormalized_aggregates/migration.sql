-- Phase 5 (cache) + the counters deferred in Phase 2. Adds denormalized
-- aggregates and backfills them from source. (The `ALTER COLUMN search_vector
-- DROP DEFAULT` that `migrate dev` injects is the known generated-column drift
-- — omitted; it would fail on the generated column.)

-- AlterTable: books rating-aggregate cache (avg_rating NULL until first rating).
ALTER TABLE "books" ADD COLUMN     "avg_rating" DOUBLE PRECISION,
ADD COLUMN     "rating_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "comment_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0;

-- Backfill from the source rows, in the migration transaction.
UPDATE "books" b
   SET "rating_count" = c.n,
       "avg_rating"   = c.avg
  FROM (
    SELECT "book_id", COUNT(*)::int AS n, AVG("value")::float8 AS avg
      FROM "ratings" GROUP BY "book_id"
  ) c
 WHERE c."book_id" = b."id";

UPDATE "reviews" r
   SET "comment_count" = c.n
  FROM (SELECT "review_id", COUNT(*)::int AS n FROM "comments" GROUP BY "review_id") c
 WHERE c."review_id" = r."id";

UPDATE "users" u
   SET "review_count" = (SELECT COUNT(*) FROM "reviews" rv WHERE rv."user_id" = u."id");

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "like_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "follower_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "following_count" INTEGER NOT NULL DEFAULT 0;

-- Backfill the counters from their source-of-truth rows. The columns land at
-- DEFAULT 0; these UPDATEs make them agree with reality for all existing data.
-- New writes keep them in sync from here on (see like/follow repositories).
-- Runs inside the migration's implicit transaction, so the table is never
-- visible with zeroed counters.

-- reviews.like_count = COUNT(likes) per review.
UPDATE "reviews" r
   SET "like_count" = c.n
  FROM (SELECT "review_id", COUNT(*)::int AS n FROM "likes" GROUP BY "review_id") c
 WHERE c."review_id" = r."id";

-- users.follower_count  = inbound  edges (followee_id = user).
-- users.following_count = outbound edges (follower_id = user).
UPDATE "users" u
   SET "follower_count"  = COALESCE(fr.n, 0),
       "following_count" = COALESCE(fg.n, 0)
  FROM (SELECT "id" FROM "users") base
  LEFT JOIN (SELECT "followee_id" AS uid, COUNT(*)::int AS n FROM "follows" GROUP BY "followee_id") fr ON fr.uid = base."id"
  LEFT JOIN (SELECT "follower_id" AS uid, COUNT(*)::int AS n FROM "follows" GROUP BY "follower_id") fg ON fg.uid = base."id"
 WHERE u."id" = base."id";

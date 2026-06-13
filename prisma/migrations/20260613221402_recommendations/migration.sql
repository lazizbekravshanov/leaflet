-- (The `ALTER COLUMN search_vector DROP DEFAULT` that migrate dev injects is
-- the known generated-column drift — omitted; it would fail on the column.)

-- CreateTable
CREATE TABLE "recommendations" (
    "user_id" TEXT NOT NULL,
    "recommended_user_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "mutuals" INTEGER NOT NULL DEFAULT 0,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("user_id","recommended_user_id")
);

-- CreateIndex
CREATE INDEX "recommendations_user_id_score_idx" ON "recommendations"("user_id", "score" DESC);

-- CreateIndex
CREATE INDEX "recommendations_recommended_user_id_idx" ON "recommendations"("recommended_user_id");

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_recommended_user_id_fkey" FOREIGN KEY ("recommended_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- You can't be recommended to yourself (Prisma can't express this).
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_no_self" CHECK ("user_id" <> "recommended_user_id");

-- DropIndex
DROP INDEX "authors_name_trgm";

-- DropIndex
DROP INDEX "books_title_trgm";

-- AlterTable
ALTER TABLE "books" ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isbn" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_url" TEXT;

-- CreateEnum
CREATE TYPE "FileActivityType" AS ENUM ('FILE_UPLOADED', 'LINK_CREATED', 'LINK_REVOKED', 'LINK_ACCESSED');

-- AlterTable
ALTER TABLE "File"
ADD COLUMN "note" TEXT;

-- AlterTable
ALTER TABLE "SecretLink"
ADD COLUMN "slug" TEXT,
ADD COLUMN "title" TEXT,
ADD COLUMN "note" TEXT,
ADD COLUMN "revokedAt" TIMESTAMP(3),
ADD COLUMN "lastAccessedAt" TIMESTAMP(3);

-- Populate existing rows before making the slug required.
UPDATE "SecretLink"
SET "slug" = 'legacy-' || "id"
WHERE "slug" IS NULL;

-- AlterTable
ALTER TABLE "SecretLink"
ALTER COLUMN "slug" SET NOT NULL;

-- CreateTable
CREATE TABLE "FileActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileId" TEXT,
    "secretLinkId" TEXT,
    "type" "FileActivityType" NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SecretLink_slug_key" ON "SecretLink"("slug");

-- AddForeignKey
ALTER TABLE "FileActivity" ADD CONSTRAINT "FileActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileActivity" ADD CONSTRAINT "FileActivity_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileActivity" ADD CONSTRAINT "FileActivity_secretLinkId_fkey" FOREIGN KEY ("secretLinkId") REFERENCES "SecretLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

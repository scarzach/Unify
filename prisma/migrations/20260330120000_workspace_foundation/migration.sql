-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "isPersonal" BOOLEAN NOT NULL DEFAULT false,
    "personalOwnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "File" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "SecretLink" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "FileActivity" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "FinancialConnection" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "FinancialAccount" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "FinancialTransaction" ADD COLUMN "workspaceId" TEXT;

-- Indexes
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
CREATE UNIQUE INDEX "Workspace_personalOwnerId_key" ON "Workspace"("personalOwnerId");
CREATE INDEX "Workspace_isPersonal_createdAt_idx" ON "Workspace"("isPersonal", "createdAt");
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");
CREATE INDEX "WorkspaceMember_userId_createdAt_idx" ON "WorkspaceMember"("userId", "createdAt");
CREATE UNIQUE INDEX "WorkspaceInvite_token_key" ON "WorkspaceInvite"("token");
CREATE UNIQUE INDEX "WorkspaceInvite_workspaceId_email_acceptedAt_key" ON "WorkspaceInvite"("workspaceId", "email", "acceptedAt");
CREATE INDEX "WorkspaceInvite_email_expiresAt_idx" ON "WorkspaceInvite"("email", "expiresAt");

-- Backfill a personal workspace for every existing user
INSERT INTO "Workspace" ("id", "name", "isPersonal", "personalOwnerId", "createdAt", "updatedAt")
SELECT
  'ws_' || "id",
  CASE
    WHEN COALESCE(NULLIF("name", ''), '') <> '' THEN "name" || '''s Workspace'
    WHEN COALESCE(NULLIF("email", ''), '') <> '' THEN "email" || '''s Workspace'
    ELSE 'Personal Workspace'
  END,
  true,
  "id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User";

INSERT INTO "WorkspaceMember" ("id", "workspaceId", "userId", "role", "joinedAt", "createdAt", "updatedAt")
SELECT
  'wsm_' || md5('ws_' || "id" || ':' || "id"),
  'ws_' || "id",
  "id",
  'OWNER'::"WorkspaceRole",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User";

-- Backfill workspace ownership on existing module data
UPDATE "Vehicle"
SET "workspaceId" = 'ws_' || "ownerId"
WHERE "workspaceId" IS NULL;

UPDATE "File"
SET "workspaceId" = 'ws_' || "uploaderId"
WHERE "workspaceId" IS NULL;

UPDATE "SecretLink"
SET "workspaceId" = 'ws_' || "ownerId"
WHERE "workspaceId" IS NULL;

UPDATE "FileActivity" AS fa
SET "workspaceId" = f."workspaceId"
FROM "File" AS f
WHERE fa."workspaceId" IS NULL
  AND f."id" = fa."fileId";

UPDATE "FileActivity" AS fa
SET "workspaceId" = sl."workspaceId"
FROM "SecretLink" AS sl
WHERE fa."workspaceId" IS NULL
  AND sl."id" = fa."secretLinkId";

UPDATE "FileActivity"
SET "workspaceId" = 'ws_' || "userId"
WHERE "workspaceId" IS NULL;

UPDATE "FinancialConnection"
SET "workspaceId" = 'ws_' || "ownerId"
WHERE "workspaceId" IS NULL;

UPDATE "FinancialAccount" AS fa
SET "workspaceId" = COALESCE(fc."workspaceId", 'ws_' || fa."ownerId")
FROM "FinancialConnection" AS fc
WHERE fa."workspaceId" IS NULL
  AND fc."id" = fa."connectionId";

UPDATE "FinancialTransaction" AS ft
SET "workspaceId" = COALESCE(fa."workspaceId", 'ws_' || ft."ownerId")
FROM "FinancialAccount" AS fa
WHERE ft."workspaceId" IS NULL
  AND fa."id" = ft."accountId";

-- Enforce not-null after backfill
ALTER TABLE "Vehicle" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "File" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "SecretLink" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "FileActivity" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "FinancialConnection" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "FinancialAccount" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "FinancialTransaction" ALTER COLUMN "workspaceId" SET NOT NULL;

-- Foreign keys
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_personalOwnerId_fkey" FOREIGN KEY ("personalOwnerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "File" ADD CONSTRAINT "File_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SecretLink" ADD CONSTRAINT "SecretLink_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FileActivity" ADD CONSTRAINT "FileActivity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialConnection" ADD CONSTRAINT "FinancialConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- New workspace-scoped indexes
CREATE INDEX "Vehicle_workspaceId_createdAt_idx" ON "Vehicle"("workspaceId", "createdAt");
CREATE INDEX "File_workspaceId_createdAt_idx" ON "File"("workspaceId", "createdAt");
CREATE INDEX "SecretLink_workspaceId_createdAt_idx" ON "SecretLink"("workspaceId", "createdAt");
CREATE INDEX "FileActivity_workspaceId_createdAt_idx" ON "FileActivity"("workspaceId", "createdAt");
CREATE INDEX "FinancialConnection_workspaceId_createdAt_idx" ON "FinancialConnection"("workspaceId", "createdAt");
CREATE INDEX "FinancialAccount_workspaceId_createdAt_idx" ON "FinancialAccount"("workspaceId", "createdAt");
CREATE INDEX "FinancialTransaction_workspaceId_postedAt_idx" ON "FinancialTransaction"("workspaceId", "postedAt");

-- Switch transaction dedupe boundary to workspace scope
ALTER TABLE "FinancialTransaction" DROP CONSTRAINT IF EXISTS "FinancialTransaction_ownerId_sourceHash_key";
CREATE UNIQUE INDEX "FinancialTransaction_workspaceId_sourceHash_key" ON "FinancialTransaction"("workspaceId", "sourceHash");

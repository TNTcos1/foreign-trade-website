-- AlterTable
ALTER TABLE "AdminSession" ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing sessions to the current user auth version so already-valid sessions remain valid.
UPDATE "AdminSession" AS session
SET "authVersion" = user_account."authVersion"
FROM "AdminUser" AS user_account
WHERE session."adminUserId" = user_account."id";

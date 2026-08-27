-- AlterTable
ALTER TABLE "ProductTranslation" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "ContentTranslation" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Backfill existing public translations without publishing parent drafts
UPDATE "ProductTranslation" AS translation
SET "publishedAt" = product."publishedAt"
FROM "Product" AS product
WHERE translation."productId" = product."id"
  AND product."publishedAt" IS NOT NULL
  AND product."status" IN ('READY_STOCK', 'FACTORY_BOOKING', 'SOLD_OUT');

UPDATE "ContentTranslation" AS translation
SET "publishedAt" = page."publishedAt"
FROM "ContentPage" AS page
WHERE translation."contentPageId" = page."id"
  AND page."publishedAt" IS NOT NULL;

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "adminUserId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductTranslation_productId_locale_publishedAt_idx" ON "ProductTranslation"("productId", "locale", "publishedAt");
CREATE INDEX "ContentTranslation_contentPageId_locale_publishedAt_idx" ON "ContentTranslation"("contentPageId", "locale", "publishedAt");
CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON "AdminSession"("tokenHash");
CREATE INDEX "AdminSession_adminUserId_revokedAt_idx" ON "AdminSession"("adminUserId", "revokedAt");
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

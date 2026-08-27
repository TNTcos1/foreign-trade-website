-- AlterTable
ALTER TABLE "Product" ADD COLUMN "draftData" JSONB;
ALTER TABLE "ProductTranslation" ADD COLUMN "draftData" JSONB;
ALTER TABLE "ContentTranslation" ADD COLUMN "draftData" JSONB;

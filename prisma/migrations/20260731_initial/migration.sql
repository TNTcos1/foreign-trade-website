-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('en', 'ar');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('STOCK_LOT', 'SINGLE_STYLE');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'READY_STOCK', 'FACTORY_BOOKING', 'SOLD_OUT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR', 'SALES');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "category" TEXT NOT NULL,
    "genderAge" TEXT,
    "season" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceType" TEXT,
    "sourceLocation" TEXT,
    "qualityGrade" TEXT,
    "clearanceReason" TEXT,
    "defectNotes" TEXT,
    "inspectionAvailable" BOOLEAN NOT NULL DEFAULT false,
    "purchaseUnit" TEXT NOT NULL,
    "minimumOrderQuantity" INTEGER,
    "tradeTerms" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "referencePriceMin" DECIMAL(12,2),
    "referencePriceMax" DECIMAL(12,2),
    "priceBasis" TEXT,
    "availableQuantity" INTEGER,
    "lastVerifiedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTranslation" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "shareImageAlt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMedia" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "mediaType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "metadata" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLotDetails" (
    "productId" UUID NOT NULL,
    "totalPieces" INTEGER NOT NULL,
    "totalPackages" INTEGER,
    "totalWeightKg" DECIMAL(12,2),
    "totalVolumeCbm" DECIMAL(12,3),
    "categoryComposition" JSONB,
    "sizeRange" TEXT,
    "piecesPerPackage" INTEGER,
    "containerLoadEstimate" JSONB,

    CONSTRAINT "StockLotDetails_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "SingleStyleDetails" (
    "productId" UUID NOT NULL,
    "styleNumber" TEXT NOT NULL,
    "fabric" TEXT,
    "styleNotes" TEXT,
    "piecesPerCarton" INTEGER,
    "factoryLeadTimeDays" INTEGER,

    CONSTRAINT "SingleStyleDetails_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "availableQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "locale" "Locale" NOT NULL DEFAULT 'en',
    "customerName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "wechat" TEXT,
    "targetPrice" DECIMAL(12,2),
    "budget" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "destinationPort" TEXT,
    "requirement" TEXT,
    "transportationPreference" TEXT,
    "internalNotes" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "assignedToId" UUID,
    "sourceVisitId" UUID,
    "firstContactAt" TIMESTAMP(3),
    "lastContactAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "quoteAmount" DECIMAL(14,2),
    "wonLostReason" TEXT,
    "deduplicationKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InquiryItem" (
    "id" UUID NOT NULL,
    "inquiryId" UUID NOT NULL,
    "productId" UUID,
    "requestedQuantity" INTEGER,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InquiryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InquiryEvent" (
    "id" UUID NOT NULL,
    "inquiryId" UUID NOT NULL,
    "authorId" UUID,
    "eventType" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InquiryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAssignment" (
    "id" UUID NOT NULL,
    "inquiryId" UUID NOT NULL,
    "assignedToId" UUID NOT NULL,
    "assignedById" UUID,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPage" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentTranslation" (
    "id" UUID NOT NULL,
    "contentPageId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "body" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketPage" (
    "id" UUID NOT NULL,
    "contentPageId" UUID NOT NULL,
    "marketCode" TEXT NOT NULL,
    "sourceTag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketProduct" (
    "marketPageId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MarketProduct_pkey" PRIMARY KEY ("marketPageId","productId")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "developmentOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermTranslation" (
    "id" UUID NOT NULL,
    "termKey" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceVisit" (
    "id" UUID NOT NULL,
    "sessionId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "campaign" TEXT,
    "source" TEXT,
    "medium" TEXT,
    "landingPage" TEXT NOT NULL,
    "firstProductId" UUID,
    "marketPageId" UUID,
    "referrer" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationAttempt" (
    "id" UUID NOT NULL,
    "inquiryId" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE INDEX "Product_status_publishedAt_idx" ON "Product"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Product_type_status_idx" ON "Product"("type", "status");

-- CreateIndex
CREATE INDEX "Product_lastVerifiedAt_idx" ON "Product"("lastVerifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTranslation_productId_locale_key" ON "ProductTranslation"("productId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMedia_productId_sortOrder_key" ON "ProductMedia"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_sku_key" ON "ProductVariant"("productId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_number_key" ON "Inquiry"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_sourceVisitId_key" ON "Inquiry"("sourceVisitId");

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_deduplicationKey_key" ON "Inquiry"("deduplicationKey");

-- CreateIndex
CREATE INDEX "Inquiry_status_createdAt_idx" ON "Inquiry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Inquiry_assignedToId_status_idx" ON "Inquiry"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "InquiryItem_inquiryId_idx" ON "InquiryItem"("inquiryId");

-- CreateIndex
CREATE INDEX "InquiryEvent_inquiryId_createdAt_idx" ON "InquiryEvent"("inquiryId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadAssignment_inquiryId_createdAt_idx" ON "LeadAssignment"("inquiryId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadAssignment_assignedToId_createdAt_idx" ON "LeadAssignment"("assignedToId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPage_slug_key" ON "ContentPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ContentTranslation_contentPageId_locale_key" ON "ContentTranslation"("contentPageId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "MarketPage_contentPageId_key" ON "MarketPage"("contentPageId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketPage_marketCode_key" ON "MarketPage"("marketCode");

-- CreateIndex
CREATE INDEX "MarketProduct_marketPageId_sortOrder_idx" ON "MarketProduct"("marketPageId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TermTranslation_termKey_locale_key" ON "TermTranslation"("termKey", "locale");

-- CreateIndex
CREATE INDEX "SourceVisit_sessionId_createdAt_idx" ON "SourceVisit"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationAttempt_status_nextAttemptAt_idx" ON "NotificationAttempt"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "NotificationAttempt_inquiryId_createdAt_idx" ON "NotificationAttempt"("inquiryId", "createdAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTranslation" ADD CONSTRAINT "ProductTranslation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMedia" ADD CONSTRAINT "ProductMedia_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotDetails" ADD CONSTRAINT "StockLotDetails_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SingleStyleDetails" ADD CONSTRAINT "SingleStyleDetails_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_sourceVisitId_fkey" FOREIGN KEY ("sourceVisitId") REFERENCES "SourceVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryItem" ADD CONSTRAINT "InquiryItem_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryItem" ADD CONSTRAINT "InquiryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryEvent" ADD CONSTRAINT "InquiryEvent_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryEvent" ADD CONSTRAINT "InquiryEvent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPage" ADD CONSTRAINT "ContentPage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPage" ADD CONSTRAINT "ContentPage_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentTranslation" ADD CONSTRAINT "ContentTranslation_contentPageId_fkey" FOREIGN KEY ("contentPageId") REFERENCES "ContentPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketPage" ADD CONSTRAINT "MarketPage_contentPageId_fkey" FOREIGN KEY ("contentPageId") REFERENCES "ContentPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketProduct" ADD CONSTRAINT "MarketProduct_marketPageId_fkey" FOREIGN KEY ("marketPageId") REFERENCES "MarketPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketProduct" ADD CONSTRAINT "MarketProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceVisit" ADD CONSTRAINT "SourceVisit_firstProductId_fkey" FOREIGN KEY ("firstProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceVisit" ADD CONSTRAINT "SourceVisit_marketPageId_fkey" FOREIGN KEY ("marketPageId") REFERENCES "MarketPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationAttempt" ADD CONSTRAINT "NotificationAttempt_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

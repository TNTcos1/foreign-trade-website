-- CreateEnum
CREATE TYPE "AdminUserAuditAction" AS ENUM ('ROLE_CHANGED', 'ACTIVATED', 'DEACTIVATED', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "AdminUserAuditEvent" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "action" "AdminUserAuditAction" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUserAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminUserAuditEvent_actorId_createdAt_idx" ON "AdminUserAuditEvent"("actorId", "createdAt");
CREATE INDEX "AdminUserAuditEvent_targetUserId_createdAt_idx" ON "AdminUserAuditEvent"("targetUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminUserAuditEvent" ADD CONSTRAINT "AdminUserAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdminUserAuditEvent" ADD CONSTRAINT "AdminUserAuditEvent_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LineIntegrationConfig" ADD COLUMN "selectedGroupId" TEXT;

CREATE TABLE "LineRecipientGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "recipientIdEncrypted" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineRecipientGroup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LineRecipientGroup_active_name_idx" ON "LineRecipientGroup"("active", "name");

CREATE TABLE "LineIntegrationConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "channelAccessTokenEncrypted" TEXT,
    "recipientIdEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineIntegrationConfig_pkey" PRIMARY KEY ("id")
);

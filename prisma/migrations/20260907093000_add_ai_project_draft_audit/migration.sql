CREATE TABLE "AiProjectDraftAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promptRedacted" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "confirmedDraft" JSONB,
    "confirmedProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "AiProjectDraftAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiProjectDraftAudit_userId_createdAt_idx" ON "AiProjectDraftAudit"("userId", "createdAt");

ALTER TABLE "AiProjectDraftAudit" ADD CONSTRAINT "AiProjectDraftAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

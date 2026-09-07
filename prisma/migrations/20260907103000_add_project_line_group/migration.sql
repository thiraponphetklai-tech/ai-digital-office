ALTER TABLE "Project"
ADD COLUMN "lineRecipientGroupId" TEXT;

CREATE INDEX "Project_lineRecipientGroupId_idx" ON "Project"("lineRecipientGroupId");

ALTER TABLE "Project"
ADD CONSTRAINT "Project_lineRecipientGroupId_fkey"
FOREIGN KEY ("lineRecipientGroupId") REFERENCES "LineRecipientGroup"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

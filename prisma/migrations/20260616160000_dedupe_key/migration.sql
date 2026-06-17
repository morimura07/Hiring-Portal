-- AlterTable: fingerprint to collapse duplicate postings (company + normalized role)
ALTER TABLE "job_postings" ADD COLUMN "dedupeKey" TEXT;
CREATE INDEX "job_postings_dedupeKey_idx" ON "job_postings"("dedupeKey");

-- AlterTable: Company gains slug (unique dedupe key) + careersUrl
ALTER TABLE "companies" ADD COLUMN "slug" TEXT NOT NULL,
ADD COLUMN "careersUrl" TEXT;

-- AlterTable: Application can reference the specific posting
ALTER TABLE "applications" ADD COLUMN "jobPostingId" TEXT;

-- CreateTable: real ingested job openings
CREATE TABLE "job_postings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "stack" TEXT[],
    "employmentType" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT true,
    "location" TEXT,
    "salaryText" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "currency" TEXT,
    "url" TEXT,
    "applyUrl" TEXT,
    "contactEmail" TEXT,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");
CREATE INDEX "job_postings_companyId_idx" ON "job_postings"("companyId");
CREATE INDEX "job_postings_discoveredAt_idx" ON "job_postings"("discoveredAt");
CREATE INDEX "job_postings_postedAt_idx" ON "job_postings"("postedAt");
CREATE INDEX "job_postings_contactEmail_idx" ON "job_postings"("contactEmail");
CREATE UNIQUE INDEX "job_postings_source_sourceId_key" ON "job_postings"("source", "sourceId");

-- Foreign keys
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "job_postings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

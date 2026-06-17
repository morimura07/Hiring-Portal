-- AlterTable: tag each performance entry with its month ("YYYY-MM")
ALTER TABLE "performance_entries" ADD COLUMN "period" TEXT NOT NULL DEFAULT '';
ALTER TABLE "performance_entries" ALTER COLUMN "period" DROP DEFAULT;
CREATE INDEX "performance_entries_period_idx" ON "performance_entries"("period");
CREATE INDEX "performance_entries_userId_period_idx" ON "performance_entries"("userId", "period");

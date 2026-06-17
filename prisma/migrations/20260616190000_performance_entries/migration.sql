-- CreateTable: per-member performance/score entries (unit $)
CREATE TABLE "performance_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "performance_entries_userId_idx" ON "performance_entries"("userId");
ALTER TABLE "performance_entries" ADD CONSTRAINT "performance_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

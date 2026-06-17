-- CreateTable: singleton scheduler config for automatic discovery refresh
CREATE TABLE "ingest_schedule" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "intervalHours" INTEGER NOT NULL DEFAULT 8,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingest_schedule_pkey" PRIMARY KEY ("id")
);

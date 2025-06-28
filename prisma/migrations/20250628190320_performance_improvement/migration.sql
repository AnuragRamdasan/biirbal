-- CreateTable
CREATE TABLE "queued_jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "queued_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "queued_jobs_status_priority_idx" ON "queued_jobs"("status", "priority");

-- CreateIndex
CREATE INDEX "queued_jobs_createdAt_idx" ON "queued_jobs"("createdAt");

-- CreateTable
CREATE TABLE "audio_listens" (
    "id" TEXT NOT NULL,
    "processedLinkId" TEXT NOT NULL,
    "userId" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "listenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "listenDuration" INTEGER,

    CONSTRAINT "audio_listens_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "audio_listens" ADD CONSTRAINT "audio_listens_processedLinkId_fkey" FOREIGN KEY ("processedLinkId") REFERENCES "processed_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

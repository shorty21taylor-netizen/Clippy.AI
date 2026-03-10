-- CreateTable
CREATE TABLE "ClipDetection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "videoTitle" TEXT,
    "channelName" TEXT,
    "niche" TEXT,
    "targetAudience" TEXT,
    "videoSummary" TEXT,
    "totalDuration" INTEGER,
    "clipsJson" JSONB NOT NULL DEFAULT '[]',
    "clipsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClipDetection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClipDetection_workspaceId_idx" ON "ClipDetection"("workspaceId");

-- AddForeignKey
ALTER TABLE "ClipDetection" ADD CONSTRAINT "ClipDetection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

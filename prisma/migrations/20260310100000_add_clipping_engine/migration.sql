-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('YOUTUBE_URL', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('PENDING', 'TRANSCRIBING', 'TRANSCRIBED', 'ANALYZING', 'ANALYZED', 'GENERATING', 'COMPLETE', 'ERROR');

-- CreateEnum
CREATE TYPE "ClipType" AS ENUM ('HOT_TAKE', 'EMOTIONAL', 'QUOTABLE', 'STORY', 'REVEAL', 'RELATABLE');

-- CreateEnum
CREATE TYPE "ClipStatus" AS ENUM ('GENERATED', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('QUEUED', 'UPLOADING', 'PROCESSING', 'PUBLISHED', 'FAILED');

-- AlterTable: SocialAccount — add OAuth fields
ALTER TABLE "SocialAccount" ADD COLUMN "tokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "SocialAccount" ADD COLUMN "platformAccountId" TEXT;
ALTER TABLE "SocialAccount" ADD COLUMN "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "SocialAccount" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SocialAccount" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- AlterTable: PublishLog — make contentPieceId optional, add clip relation + posting fields
ALTER TABLE "PublishLog" ALTER COLUMN "contentPieceId" DROP NOT NULL;
ALTER TABLE "PublishLog" ADD COLUMN "clipId" TEXT;
ALTER TABLE "PublishLog" ADD COLUMN "platform" "Platform";
ALTER TABLE "PublishLog" ADD COLUMN "publishStatus" "PublishStatus" NOT NULL DEFAULT 'QUEUED';
ALTER TABLE "PublishLog" ADD COLUMN "caption" TEXT;
ALTER TABLE "PublishLog" ADD COLUMN "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "PublishLog" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- CreateTable: SourceVideo
CREATE TABLE "SourceVideo" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourceUrl" TEXT,
    "sourceFilePath" TEXT,
    "duration" INTEGER,
    "transcript" TEXT,
    "clipAnalysis" JSONB,
    "status" "IngestionStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Clip
CREATE TABLE "Clip" (
    "id" TEXT NOT NULL,
    "sourceVideoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "viralityScore" INTEGER NOT NULL,
    "clipType" "ClipType" NOT NULL,
    "hook" TEXT,
    "suggestedCaption" TEXT,
    "suggestedHashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "viralityReason" TEXT,
    "transcriptExcerpt" TEXT,
    "videoPath" TEXT,
    "thumbnailPath" TEXT,
    "srtPath" TEXT,
    "status" "ClipStatus" NOT NULL DEFAULT 'GENERATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clip_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Analytics
CREATE TABLE "Analytics" (
    "id" TEXT NOT NULL,
    "publishLogId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SourceVideo_workspaceId_idx" ON "SourceVideo"("workspaceId");
CREATE INDEX "SourceVideo_workspaceId_status_idx" ON "SourceVideo"("workspaceId", "status");

CREATE INDEX "Clip_sourceVideoId_idx" ON "Clip"("sourceVideoId");
CREATE INDEX "Clip_sourceVideoId_viralityScore_idx" ON "Clip"("sourceVideoId", "viralityScore" DESC);

CREATE INDEX "PublishLog_clipId_idx" ON "PublishLog"("clipId");

CREATE INDEX "Analytics_publishLogId_idx" ON "Analytics"("publishLogId");
CREATE INDEX "Analytics_socialAccountId_idx" ON "Analytics"("socialAccountId");
CREATE INDEX "Analytics_fetchedAt_idx" ON "Analytics"("fetchedAt");

-- AddForeignKey
ALTER TABLE "SourceVideo" ADD CONSTRAINT "SourceVideo_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_sourceVideoId_fkey" FOREIGN KEY ("sourceVideoId") REFERENCES "SourceVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublishLog" ADD CONSTRAINT "PublishLog_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "Clip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Analytics" ADD CONSTRAINT "Analytics_publishLogId_fkey" FOREIGN KEY ("publishLogId") REFERENCES "PublishLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Analytics" ADD CONSTRAINT "Analytics_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

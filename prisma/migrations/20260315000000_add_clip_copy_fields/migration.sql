-- Add AI copywriting fields to Clip model
ALTER TABLE "Clip" ADD COLUMN IF NOT EXISTS "hookText" TEXT;
ALTER TABLE "Clip" ADD COLUMN IF NOT EXISTS "captions" JSONB;
ALTER TABLE "Clip" ADD COLUMN IF NOT EXISTS "hashtagSets" JSONB;
ALTER TABLE "Clip" ADD COLUMN IF NOT EXISTS "selectedCaptionStyle" TEXT DEFAULT 'curiosity';
ALTER TABLE "Clip" ADD COLUMN IF NOT EXISTS "goal" TEXT;

-- Add goal and goalSettings to SourceVideo model
ALTER TABLE "SourceVideo" ADD COLUMN IF NOT EXISTS "goal" TEXT;
ALTER TABLE "SourceVideo" ADD COLUMN IF NOT EXISTS "goalSettings" JSONB;

ALTER TABLE public."Job"
  ADD COLUMN IF NOT EXISTS "qualityStatus" TEXT NOT NULL DEFAULT 'ok';

ALTER TABLE public."Job"
  DROP CONSTRAINT IF EXISTS "Job_qualityStatus_check";

ALTER TABLE public."Job"
  ADD CONSTRAINT "Job_qualityStatus_check"
  CHECK ("qualityStatus" IN ('ok', 'needs_review'));

UPDATE public."Job"
SET "qualityStatus" = 'needs_review'
WHERE id IN (
  SELECT id FROM public.jobs_backup_20260929
);

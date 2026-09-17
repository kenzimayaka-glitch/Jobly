-- C0.6: prevent duplicate imported listings by source + canonical source URL.
-- PostgreSQL permits multiple NULL values in a unique index, preserving local/manual jobs.
CREATE UNIQUE INDEX IF NOT EXISTS "Job_source_sourceUrl_key" ON "Job"("source", "sourceUrl");

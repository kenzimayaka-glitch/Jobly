ALTER TABLE "JobSource"
  ADD COLUMN "adapterKey" TEXT,
  ADD COLUMN "feedUrl" TEXT,
  ADD COLUMN "maxItems" INTEGER NOT NULL DEFAULT 50;

CREATE INDEX "JobSource_adapterKey_idx" ON "JobSource"("adapterKey");

UPDATE "JobSource"
SET "ingestionMode" = 'RSS',
    "adapterKey" = 'rss',
    "feedUrl" = 'https://www.cameroondesks.com/feeds/posts/default/-/jobs?alt=rss',
    "maxItems" = 50,
    "notes" = COALESCE("notes", '') || ' C0.6.2: RSS adapter configured; verify provider terms/permission before production scheduling.'
WHERE lower("name") IN ('cameroon desk', 'cameroondesks');

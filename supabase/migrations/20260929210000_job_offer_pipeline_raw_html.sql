-- Keep the immutable source capture separate from browser-rendered content.
-- This prevents a rendered DOM from replacing the original source evidence.
alter table if exists public."JobOfferPipeline"
  add column if not exists "rawHtml" text;

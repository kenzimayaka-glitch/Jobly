-- Keep manual payment receipts private; admin reviews use short-lived signed URLs.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('jobly-payment-proofs','jobly-payment-proofs',FALSE,10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf']::text[])
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name, public=FALSE, file_size_limit=EXCLUDED.file_size_limit,
  allowed_mime_types=EXCLUDED.allowed_mime_types;

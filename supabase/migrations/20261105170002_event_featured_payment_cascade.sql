ALTER TABLE public."EventFeaturedCampaign"
  DROP CONSTRAINT IF EXISTS "EventFeaturedCampaign_paymentId_fkey";
ALTER TABLE public."EventFeaturedCampaign"
  ADD CONSTRAINT "EventFeaturedCampaign_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES public."Payment"(id) ON DELETE CASCADE;

CREATE TABLE "Event" (
  "id" TEXT PRIMARY KEY,
  "creatorUserId" TEXT NOT NULL,
  "organizerName" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "subdomains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "campaignStartAt" TIMESTAMP(3) NOT NULL,
  "campaignEndAt" TIMESTAMP(3) NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'PHYSICAL',
  "venue" TEXT,
  "city" TEXT,
  "country" TEXT NOT NULL DEFAULT 'CM',
  "registrationMode" TEXT NOT NULL DEFAULT 'EXTERNAL',
  "registrationUrl" TEXT,
  "audience" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "mediaType" TEXT,
  "mediaUrl" TEXT,
  "mediaSizeBytes" INTEGER,
  "mediaDurationSeconds" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "publicationSource" TEXT NOT NULL DEFAULT 'STANDARD',
  "priceAmount" INTEGER NOT NULL DEFAULT 0,
  "priceCurrency" TEXT NOT NULL DEFAULT 'XAF',
  "safetyAcceptedAt" TIMESTAMP(3),
  "rightsAcceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Event_status_campaign_idx" ON "Event"("status","campaignStartAt","campaignEndAt");
CREATE INDEX "Event_domain_idx" ON "Event"("domain");
CREATE INDEX "Event_creator_idx" ON "Event"("creatorUserId");

CREATE TABLE "EventPayment" (
  "id" TEXT PRIMARY KEY, "eventId" TEXT NOT NULL, "paymentId" TEXT NOT NULL, "purpose" TEXT NOT NULL,
  "amount" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "EventPayment_payment_unique" ON "EventPayment"("paymentId");
CREATE INDEX "EventPayment_event_idx" ON "EventPayment"("eventId");

CREATE TABLE "EventFeaturedCampaign" (
  "id" TEXT PRIMARY KEY, "eventId" TEXT NOT NULL, "slot" INTEGER NOT NULL, "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL, "price" INTEGER NOT NULL, "paymentId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "EventFeaturedCampaign_active_idx" ON "EventFeaturedCampaign"("status","startAt","endAt");
CREATE UNIQUE INDEX "EventFeaturedCampaign_payment_unique" ON "EventFeaturedCampaign"("paymentId");

CREATE TABLE "EventEntitlement" (
  "id" TEXT PRIMARY KEY, "organizerUserId" TEXT NOT NULL, "source" TEXT NOT NULL,
  "freePublication" BOOLEAN NOT NULL DEFAULT FALSE, "freeFeatured" BOOLEAN NOT NULL DEFAULT FALSE,
  "maxDurationDays" INTEGER NOT NULL DEFAULT 90, "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3), "active" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "EventEntitlement_lookup_idx" ON "EventEntitlement"("organizerUserId","active","validFrom","validUntil");

ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventFeaturedCampaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventEntitlement" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "Event" FROM anon, authenticated;
REVOKE ALL ON "EventPayment" FROM anon, authenticated;
REVOKE ALL ON "EventFeaturedCampaign" FROM anon, authenticated;
REVOKE ALL ON "EventEntitlement" FROM anon, authenticated;

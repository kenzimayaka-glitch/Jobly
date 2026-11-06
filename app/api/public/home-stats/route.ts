import { NextResponse } from "next/server";
import { adminClient } from "../../../../lib/server-auth";
import { resolveEffectivePublicationDate } from "../../../../supabase/functions/_shared/job-freshness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// These are the requested public minimums. Real records are added on top,
// so every insert/delete changes the visible counters without going below them.
const OFFERS_BASELINE = 75_000;
const TALENTS_BASELINE = 315_000;
const PAGE_SIZE = 1000;
const CAPTURE_ID_BATCH_SIZE = 200;

type DiscoveryOffer = {
  id: string;
  sourcePublishedAt: string | null;
  createdAt: string;
  deadline: string | null;
  opportunityType: string | null;
};

type HarvestCapture = { jobId: string; discoveredAt: string };

type RecruiterOffer = {
  id: string;
  createdAt: string;
};

async function fetchAllActiveDiscoveryOffers(
  supabase: ReturnType<typeof adminClient>,
): Promise<DiscoveryOffer[]> {
  const offers: DiscoveryOffer[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("Job")
      .select("id,sourcePublishedAt,createdAt,deadline,opportunityType")
      .eq("isActive", true)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as DiscoveryOffer[];
    offers.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return offers;
}

async function fetchFirstHarvestDates(
  supabase: ReturnType<typeof adminClient>,
  offers: DiscoveryOffer[],
): Promise<Map<string, string>> {
  const ids = offers
    .filter((offer) => !offer.sourcePublishedAt)
    .map((offer) => offer.id);
  const firstHarvestByJob = new Map<string, string>();

  for (let index = 0; index < ids.length; index += CAPTURE_ID_BATCH_SIZE) {
    const batch = ids.slice(index, index + CAPTURE_ID_BATCH_SIZE);

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("JobHarvestCapture")
        .select("jobId,discoveredAt")
        .in("jobId", batch)
        .order("discoveredAt", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      const page = (data ?? []) as HarvestCapture[];
      for (const capture of page) {
        if (capture.jobId && capture.discoveredAt && !firstHarvestByJob.has(capture.jobId)) {
          firstHarvestByJob.set(capture.jobId, capture.discoveredAt);
        }
      }

      if (page.length < PAGE_SIZE) break;
    }
  }

  return firstHarvestByJob;
}

async function fetchPublishedRecruiterOffers(
  supabase: ReturnType<typeof adminClient>,
  now: Date,
): Promise<RecruiterOffer[]> {
  const twoMonthsAgoDate = new Date(now);
  twoMonthsAgoDate.setMonth(twoMonthsAgoDate.getMonth() - 2);
  const twoMonthsAgo = twoMonthsAgoDate.toISOString();
  const offers: RecruiterOffer[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("RecruiterJob")
      .select("id,createdAt")
      .eq("status", "published")
      .eq("applicationReady", true)
      .gte("createdAt", twoMonthsAgo)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as RecruiterOffer[];
    offers.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return offers;
}

export async function GET() {
  try {
    const supabase = adminClient();
    const now = new Date();
    const nowIso = now.toISOString();

    const [discoveryOffers, recruiterOffers, talentProfiles] = await Promise.all([
      fetchAllActiveDiscoveryOffers(supabase),
      fetchPublishedRecruiterOffers(supabase, now),
      supabase.from("Profile").select("id", { count: "exact", head: true }),
    ]);

    if (talentProfiles.error) throw talentProfiles.error;

    const firstHarvestByJob = await fetchFirstHarvestDates(supabase, discoveryOffers);

    const visibleDiscoveryOffers = discoveryOffers.filter((offer) => {
      if (offer.opportunityType && offer.opportunityType !== "EMPLOI") return false;

      return resolveEffectivePublicationDate({
        sourcePublishedAt: offer.sourcePublishedAt,
        firstHarvestAt: firstHarvestByJob.get(offer.id) ?? null,
        createdAt: offer.createdAt,
        deadline: offer.deadline,
        now: nowIso,
      }).visible;
    }).length;

    const visibleRecruiterOffers = recruiterOffers.filter((offer) =>
      resolveEffectivePublicationDate({
        sourcePublishedAt: null,
        firstHarvestAt: null,
        createdAt: offer.createdAt,
        deadline: null,
        now: nowIso,
      }).visible,
    ).length;

    return NextResponse.json(
      {
        offersCount: OFFERS_BASELINE + visibleDiscoveryOffers + visibleRecruiterOffers,
        talentsCount: TALENTS_BASELINE + (talentProfiles.count ?? 0),
        updatedAt: nowIso,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=30",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { message: "Les statistiques publiques sont momentanément indisponibles." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

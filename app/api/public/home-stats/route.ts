import { NextResponse } from "next/server";
import { adminClient } from "../../../../lib/server-auth";
import { resolveEffectivePublicationDate } from "../../../../supabase/functions/_shared/job-freshness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;
const CAPTURE_ID_BATCH_SIZE = 200;
const AFRICAN_COUNTRY_CODES = [
  "AO", "BF", "BI", "BJ", "BW", "CD", "CF", "CG", "CI", "CM", "CV",
  "DJ", "DZ", "EG", "ER", "ET", "GA", "GH", "GM", "GN", "GQ", "GW",
  "KE", "KM", "LR", "LS", "LY", "MA", "MG", "ML", "MR", "MU", "MW",
  "MZ", "NA", "NE", "NG", "RW", "SC", "SD", "SL", "SN", "SO", "SS",
  "ST", "SZ", "TD", "TG", "TN", "TZ", "UG", "ZA", "ZM", "ZW",
  "EH",
] as const;

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
      .in("countryCode", [...AFRICAN_COUNTRY_CODES])
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
      .in("countryCode", [...AFRICAN_COUNTRY_CODES])
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
  let stage = "initialize";
  try {
    stage = "admin_client";
    const supabase = adminClient();
    const now = new Date();
    const nowIso = now.toISOString();

    stage = "discovery_recruiter_profile_queries";
    const [discoveryOffers, recruiterOffers, talentProfiles] = await Promise.all([
      fetchAllActiveDiscoveryOffers(supabase),
      fetchPublishedRecruiterOffers(supabase, now),
      supabase.from("Profile").select("id, User!inner(role)", { count: "exact", head: true }).eq("User.role", "TALENT"),
    ]);

    if (talentProfiles.error) throw talentProfiles.error;

    stage = "first_harvest_dates";
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

    stage = "response";
    return NextResponse.json(
      {
        // Count only visible, fresh offers located in African countries.
        offersCount: visibleDiscoveryOffers + visibleRecruiterOffers,
        talentsCount: talentProfiles.count ?? 0,
        updatedAt: nowIso,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=10, stale-while-revalidate=5",
        },
      },
    );
  } catch (error) {
    const errorCode =
      error && typeof error === "object" && "code" in error && typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : "UNKNOWN";
    const errorName = error instanceof Error ? error.name : typeof error;
    const rawMessage =
      error instanceof Error
        ? error.message
        : error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "Non-error throwable";
    const safeMessage = rawMessage
      .split(" ")
      .map((part) =>
        part.startsWith("http") ? "[url redacted]" :
        part === "Bearer" ? "[bearer redacted]" :
        part.startsWith("eyJ") ? "[token redacted]" : part
      )
      .join(" ")
      .slice(0, 180);
    console.error("[public-home-stats] request failed", { stage, errorCode, errorName, safeMessage });
    return NextResponse.json(
      { message: "Les statistiques publiques sont momentanément indisponibles." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

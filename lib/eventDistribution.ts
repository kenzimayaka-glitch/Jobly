import crypto from "node:crypto";

type Db = ReturnType<typeof import("./server-auth").adminClient>;

type EventLike = {
  id: string;
  title: string;
  description: string;
  domain: string;
  subdomains?: string[];
  city?: string | null;
  country?: string | null;
  startAt: string;
  endAt?: string | null;
};

const normalize = (v: unknown) =>
  String(v ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const domainKeywords: Record<string, string[]> = {
  EMPLOYMENT_RECRUITMENT: ["emploi", "recrutement", "career", "job", "emploi"],
  EDUCATION_CAMPUS: ["education", "campus", "universite", "etudiant", "formation"],
  MOBILITY: ["mobilite", "migration", "international", "relocation"],
  ENTREPRENEURSHIP: ["entrepreneuriat", "startup", "entrepreneur", "business"],
  SCHOLARSHIP: ["bourse", "scholarship", "etude", "education"],
  YOUTH_PROGRAMS: ["jeunesse", "youth", "jeune"],
  INSTITUTIONAL: ["institution", "public", "ong", "municipalite"],
};

function relevantCommunity(event: EventLike, community: { category?: string; name?: string; description?: string; city?: string | null; country?: string | null }) {
  const hay = normalize([community.category, community.name, community.description].join(" "));
  const keys = domainKeywords[event.domain] ?? [];
  const keywordMatch = keys.some((k) => hay.includes(normalize(k)));
  const cityMatch = !event.city || !community.city || normalize(event.city) === normalize(community.city);
  const countryMatch = !event.country || !community.country || normalize(event.country) === normalize(community.country);
  return (keywordMatch || cityMatch) && countryMatch;
}

export async function estimateAndDistributeEvent(db: Db, event: EventLike) {
  const { data: communities, error: ce } = await db
    .from("Community")
    .select("id,name,category,description,city,country")
    .eq("status", "ACTIVE")
    .limit(500);
  if (ce) throw new Error(ce.message);

  const matchingCommunities = (communities ?? []).filter((c) => relevantCommunity(event, c));
  const communityIds = matchingCommunities.map((c) => c.id);

  let memberRows: Array<{ userId: string; communityId: string }> = [];
  if (communityIds.length) {
    const { data: members, error: me } = await db
      .from("CommunityMembership")
      .select("userId,communityId")
      .in("communityId", communityIds)
      .limit(5000);
    if (me) throw new Error(me.message);
    memberRows = (members ?? []) as Array<{ userId: string; communityId: string }>;
  }

  const memberIds = [...new Set(memberRows.map((m) => m.userId).filter(Boolean))];
  const notifications = memberIds
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
    .map((userId) => ({
      id: crypto.randomUUID(),
      userId,
      type: "JOBLY_EVENT",
      title: "Un événement peut vous concerner",
      body: event.title,
      link: "/events/" + event.id,
      entityId: event.id,
      actionType: "VIEW_EVENT",
      actionPayload: { source: "JIA_EVENT_DISTRIBUTION", eventId: event.id },
      locale: "fr",
      channels: { push: false, email: false, inApp: true },
      createdAt: new Date().toISOString(),
    }));

  let distributed = 0;
  if (notifications.length) {
    const { error: ne } = await db.from("Notification").insert(notifications);
    if (!ne) distributed = notifications.length;
  }

  const estimatedReach = Math.max(memberIds.length, matchingCommunities.length * 25);
  const uniqueUsers = memberIds.length;
  const audienceEstimate = {
    people: estimatedReach,
    communityMembers: uniqueUsers,
    communities: matchingCommunities.length,
    recruiters: event.domain === "EMPLOYMENT_RECRUITMENT" ? Math.max(0, Math.round(estimatedReach * 0.08)) : 0,
    partners: Math.max(0, Math.round(matchingCommunities.length * 0.15)),
  };

  await db.from("JiaEvent").insert({
    userId: "00000000-0000-0000-0000-000000000000",
    eventType: "JOBLY_EVENT_DISTRIBUTION",
    path: "/events/" + event.id,
    metadata: {
      eventId: event.id,
      matchingCommunityIds: communityIds,
      audienceEstimate,
      distributedNotifications: distributed,
    },
  });

  return { audienceEstimate, matchingCommunityIds: communityIds, distributed };
}

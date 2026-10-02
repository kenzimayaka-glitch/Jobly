import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const JOBLY_COMMUNITY_SYSTEM_USER_ID = "jobly-community-system";
export const COMMUNITY_DISCIPLINE_THRESHOLD = 1000;
const PAID_PLANS = ["START", "PREMIUM", "PRO", "PREMIUM_MONTHLY", "PREMIUM_ANNUAL"];

const GLOBAL_COMMUNITIES = new Set([
  "Tech & Digital",
  "Business & Sales",
  "Marketing & Communication",
  "Finance & Comptabilité",
  "Ressources humaines",
  "Ingénierie & Industrie",
  "Design & Créativité",
  "Éducation & Formation",
]);

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function communityCategoriesForContent(title: string, description: string, explicit?: string[]) {
  const text = `${title} ${description}`.toLowerCase();
  const categories = new Set((explicit || []).map(clean).filter(Boolean));

  const rules: Array<[string, string[]]> = [
    ["Tech & Digital", ["tech", "digital", "développement", "developer", "développeur", "logiciel", "data", "ia", "cyber", "cloud", "web", "informatique"]],
    ["Business & Sales", ["business", "vente", "sales", "commercial", "commerce", "entrepreneur", "entrepreneuriat", "partenariat"]],
    ["Marketing & Communication", ["marketing", "communication", "branding", "publicité", "social media", "contenu"]],
    ["Finance & Comptabilité", ["finance", "comptabilité", "comptable", "banque", "audit", "fiscalité"]],
    ["Ressources humaines", ["ressources humaines", "rh", "recrutement", "talent", "hr"]],
    ["Ingénierie & Industrie", ["ingénierie", "industrie", "industriel", "mécanique", "électrique", "construction", "bâtiment"]],
    ["Design & Créativité", ["design", "graphisme", "créatif", "création", "ux", "ui", "photo", "vidéo"]],
    ["Éducation & Formation", ["formation", "éducation", "enseignement", "cours", "certification", "atelier", "apprentissage"]],
  ];

  for (const [category, keywords] of rules) {
    if (keywords.some((keyword) => text.includes(keyword))) categories.add(category);
  }

  return [...categories];
}

async function notifyUsers(
  db: SupabaseClient,
  userIds: string[],
  communityId: string,
  communityName: string,
  discipline: string,
) {
  const now = new Date().toISOString();
  const rows = userIds.map((userId) => ({
    id: crypto.randomUUID(),
    userId,
    type: "COMMUNITY_CREATED",
    title: `J’IA a créé ${communityName}`,
    body: `Une nouvelle communauté correspondant à votre discipline (${discipline}) est disponible. Rejoignez-la quand vous le souhaitez.`,
    link: `/communities/${communityId}`,
    entityId: communityId,
    actionType: "JOIN_COMMUNITY",
    actionPayload: { communityId, discipline },
    locale: "fr",
    channels: { inApp: true },
    createdAt: now,
  }));

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from("Notification").insert(rows.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }
}

export async function maybeCreateDisciplineCommunity(db: SupabaseClient, disciplineInput: string) {
  const discipline = clean(disciplineInput);
  if (!discipline || GLOBAL_COMMUNITIES.has(discipline)) return null;

  const { data: profiles, error: profileError } = await db
    .from("Profile")
    .select("userId")
    .contains("preferredSectors", [discipline]);
  if (profileError) throw new Error(profileError.message);

  const profileUserIds = [...new Set((profiles || []).map((row: any) => row.userId).filter(Boolean))];
  if (profileUserIds.length < COMMUNITY_DISCIPLINE_THRESHOLD) return null;

  const { data: paidSubscriptions, error: subscriptionError } = await db
    .from("Subscription")
    .select("userId")
    .in("userId", profileUserIds)
    .eq("status", "ACTIVE")
    .in("planCode", PAID_PLANS);
  if (subscriptionError) throw new Error(subscriptionError.message);

  const paidUserIds = [...new Set((paidSubscriptions || []).map((row: any) => row.userId).filter(Boolean))];
  if (paidUserIds.length < COMMUNITY_DISCIPLINE_THRESHOLD) return null;

  const slug = `discipline-${slugify(discipline)}`;
  const { data: existing, error: existingError } = await db
    .from("Community")
    .select("id,name")
    .eq("slug", slug)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing) return existing;

  const now = new Date().toISOString();
  const communityId = crypto.randomUUID();
  const { data: community, error: createError } = await db
    .from("Community")
    .insert({
      id: communityId,
      createdById: JOBLY_COMMUNITY_SYSTEM_USER_ID,
      name: discipline,
      slug,
      description: `Communauté professionnelle Jobly dédiée à ${discipline}.`,
      category: discipline,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    })
    .select("id,name,slug,category")
    .single();
  if (createError) throw new Error(createError.message);

  await notifyUsers(db, paidUserIds, community.id, community.name, discipline);
  return community;
}

export async function announceEventToCommunities(
  db: SupabaseClient,
  event: { id: string; title: string; description?: string; imageUrl?: string | null; sourceUrl?: string | null; discipline?: string | null; categories?: string[] },
) {
  const categories = communityCategoriesForContent(event.title, event.description || "", [
    ...(event.discipline ? [event.discipline] : []),
    ...(event.categories || []),
  ]);
  if (!categories.length) return { communities: 0, posts: 0 };

  const { data: communities, error } = await db
    .from("Community")
    .select("id,name,category")
    .eq("status", "ACTIVE")
    .in("category", categories);
  if (error) throw new Error(error.message);
  if (!communities?.length) return { communities: 0, posts: 0 };

  const now = new Date().toISOString();
  let posts = 0;
  for (const community of communities) {
    const { data: existing } = await db
      .from("CommunityPost")
      .select("id")
      .eq("communityId", community.id)
      .eq("sourceType", "EVENT")
      .eq("sourceId", event.id)
      .maybeSingle();
    if (existing) continue;

    const { error: postError } = await db.from("CommunityPost").insert({
      id: crypto.randomUUID(),
      communityId: community.id,
      authorId: JOBLY_COMMUNITY_SYSTEM_USER_ID,
      content: `📅 J’IA partage cet événement avec la communauté.\\n\\n${event.title}\\n\\n${event.description || "Un événement qui peut intéresser les membres de cette communauté."}`,
      status: "PUBLISHED",
      sourceType: "EVENT",
      sourceId: event.id,
      mediaUrl: event.imageUrl || null,
      sourceUrl: event.sourceUrl || null,
      createdAt: now,
      updatedAt: now,
    });
    if (postError) throw new Error(postError.message);
    posts += 1;
  }

  return { communities: communities.length, posts };
}

export function contentCommunityCategories(title: string, description: string, explicit?: string[]) {
  return communityCategoriesForContent(title, description, explicit);
}

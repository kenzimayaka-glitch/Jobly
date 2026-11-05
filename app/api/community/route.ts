import { NextRequest, NextResponse } from "next/server";
import { getCommunityAccess } from "@/lib/community/access";
import { adminClient, newId } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export async function GET(request: NextRequest) {
  try {
    const db = adminClient();
    const access = await getCommunityAccess(request);
    const p = request.nextUrl.searchParams;
    const country = clean(p.get("country"));
    const city = clean(p.get("city"));
    const category = clean(p.get("category"));

    let query = db
      .from("Community")
      .select("id,name,slug,description,category,country,city,createdAt")
      .eq("status", "ACTIVE")
      .order("name", { ascending: true })
      .limit(50);

    if (country) query = query.eq("country", country);
    if (city) query = query.eq("city", city);
    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const communities = await Promise.all((data || []).map(async (community) => {
      const [members, posts, myMembership] = await Promise.all([
        db.from("CommunityMembership").select("id", { count: "exact", head: true }).eq("communityId", community.id).neq("role", "BANNED"),
        db.from("CommunityPost").select("id", { count: "exact", head: true }).eq("communityId", community.id).eq("status", "PUBLISHED"),
        access.user
          ? db.from("CommunityMembership").select("id,role").eq("communityId", community.id).eq("userId", access.user.id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (members.error) throw new Error(members.error.message);
      if (posts.error) throw new Error(posts.error.message);
      if (myMembership.error) throw new Error(myMembership.error.message);
      return {
        ...community,
        memberCount: members.count || 0,
        postCount: posts.count || 0,
        isMember: Boolean(myMembership.data && myMembership.data.role !== "BANNED"),
        membershipRole: myMembership.data?.role || null,
      };
    }));

    return NextResponse.json({
      communities,
      access: { allowed: access.allowed, reason: access.reason, blueBadge: access.blueBadge },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Communautés indisponibles." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await getCommunityAccess(request);
  if (!access.authUser || !access.user || !access.db) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }
  if (!access.allowed) {
    return NextResponse.json({ error: "Community est réservé aux abonnés avec accès actif.", code: "COMMUNITY_SUBSCRIPTION_REQUIRED" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = clean(body.name);
  const category = clean(body.category);
  const description = clean(body.description);
  if (!name || !category) return NextResponse.json({ error: "name et category sont requis." }, { status: 400 });

  const slugBase = slugify(name) || newId();
  let slug = slugBase;
  const { data: existingSlug } = await access.db.from("Community").select("id").eq("slug", slug).maybeSingle();
  if (existingSlug) slug = `${slugBase}-${Math.random().toString(36).slice(2, 7)}`;

  const now = new Date().toISOString();
  const { data, error } = await access.db.from("Community").insert({
    id: newId(),
    createdById: access.user.id,
    name,
    slug,
    description: description || null,
    category,
    country: clean(body.country) || access.user.country || null,
    city: clean(body.city) || null,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  }).select("id,name,slug,description,category,country,city,createdAt").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ community: data }, { status: 201 });
}

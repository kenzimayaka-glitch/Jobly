import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { announceEventToCommunities } from "@/lib/community/automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const db = adminClient();
  const moderator = await ensureUser(db, auth);
  if (String(moderator.role).toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "Droit de modération réservé au compte ADMIN maître." }, { status: 403 });
  }
  const { data: identity, error: identityError } = await db.from("AdminIdentity").select("active")
    .eq("authUserId", auth.id).eq("ownerUserId", moderator.id).maybeSingle();
  if (identityError) throw new Error(identityError.message);
  if (!identity?.active) return NextResponse.json({ error: "Identité ADMIN maître inactive." }, { status: 403 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const decision = typeof body.decision === "string" ? body.decision.trim().toUpperCase() : "";
  if (decision !== "APPROVE" && decision !== "REJECT") {
    return NextResponse.json({ error: "decision doit être APPROVE ou REJECT." }, { status: 400 });
  }

  const { data: current, error: currentError } = await db
    .from("BonPlan")
    .select("id,title,description,category,country,city,sourceUrl,imageUrl,status,startsAt,expiresAt")
    .eq("id", id)
    .maybeSingle();

  if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 });
  if (!current) return NextResponse.json({ error: "Proposition introuvable." }, { status: 404 });
  if (current.status !== "PENDING_REVIEW") {
    return NextResponse.json({ error: "Cette proposition a déjà été traitée." }, { status: 409 });
  }

  const status = decision === "APPROVE" ? "PUBLISHED" : "REJECTED";
  const { data: item, error: updateError } = await db
    .from("BonPlan")
    .update({ status, updatedAt: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "PENDING_REVIEW")
    .select("*")
    .maybeSingle();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  if (!item) return NextResponse.json({ error: "Cette proposition a déjà été traitée." }, { status: 409 });

  let communityAnnouncement = null;
  const normalizedCategory = String(item.category || "").trim().toLowerCase();
  if (decision === "APPROVE" && ["event", "events", "événement", "événements"].includes(normalizedCategory)) {
    try {
      communityAnnouncement = await announceEventToCommunities(db, {
        id: item.id,
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
        sourceUrl: item.sourceUrl,
        discipline: null,
        categories: [],
      });
    } catch (error) {
      return NextResponse.json({
        item,
        communityAnnouncement: null,
        warning: error instanceof Error ? error.message : "L’annonce Community n’a pas pu être créée.",
      });
    }
  }

  return NextResponse.json({ item, communityAnnouncement });
}

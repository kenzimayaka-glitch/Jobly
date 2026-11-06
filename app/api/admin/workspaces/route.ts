import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LABELS = {
  SUPPORT: "Support",
  FINANCE: "Finance",
  MODERATOR: "Modération",
  ANALYST: "Analyse",
} as const;
type WorkspaceCode = keyof typeof LABELS;

async function requireAdmin(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return { response: NextResponse.json({ message: "Session requise." }, { status: 401 }) };
  const db = adminClient();
  const user = await ensureUser(db, auth);
  if (String(user.role).toUpperCase() !== "ADMIN") {
    return { response: NextResponse.json({ message: "Espace administrateur requis." }, { status: 403 }) };
  }
  const { data: identity, error } = await db.from("AdminIdentity")
    .select("active").eq("authUserId", auth.id).eq("ownerUserId", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!identity?.active) {
    return { response: NextResponse.json({ message: "Identité administrateur inactive." }, { status: 403 }) };
  }
  return { db, user };
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireAdmin(request);
    if ("response" in access) return access.response;
    const { data, error } = await access.db.from("AdminWorkspace")
      .select("id,code,label,enabled,createdAt,updatedAt")
      .eq("ownerUserId", access.user.id)
      .order("createdAt", { ascending: true });
    if (error) throw new Error(error.message);
    return NextResponse.json({ workspaces: data || [] });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Espaces internes indisponibles." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdmin(request);
    if ("response" in access) return access.response;
    const body = await request.json().catch(() => ({}));
    const code = String(body.code || "").toUpperCase() as WorkspaceCode;
    if (!(code in LABELS)) return NextResponse.json({ message: "Espace interne non autorisé." }, { status: 400 });

    const { data: current, error: lookupError } = await access.db.from("AdminWorkspace")
      .select("id").eq("ownerUserId", access.user.id).eq("code", code).maybeSingle();
    if (lookupError) throw new Error(lookupError.message);

    const now = new Date().toISOString();
    const result = current
      ? await access.db.from("AdminWorkspace").update({ enabled: true, label: LABELS[code], updatedAt: now })
          .eq("id", current.id).select("id,code,label,enabled,createdAt,updatedAt").single()
      : await access.db.from("AdminWorkspace").insert({
          id: crypto.randomUUID(), ownerUserId: access.user.id, code, label: LABELS[code], enabled: true, updatedAt: now,
        }).select("id,code,label,enabled,createdAt,updatedAt").single();
    if (result.error) throw new Error(result.error.message);
    return NextResponse.json({ workspace: result.data }, { status: current ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Création de l'espace impossible." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await requireAdmin(request);
    if ("response" in access) return access.response;
    const body = await request.json().catch(() => ({}));
    const code = String(body.code || "").toUpperCase() as WorkspaceCode;
    if (!(code in LABELS)) return NextResponse.json({ message: "Espace interne non autorisé." }, { status: 400 });
    const { data, error } = await access.db.from("AdminWorkspace")
      .update({ enabled: false, updatedAt: new Date().toISOString() })
      .eq("ownerUserId", access.user.id)
      .eq("code", code)
      .select("id,code,label,enabled")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ message: "Espace introuvable." }, { status: 404 });
    return NextResponse.json({ workspace: data });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Désactivation impossible." }, { status: 500 });
  }
}

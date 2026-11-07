import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const db = adminClient();
  const user = await ensureUser(db, auth);
  if (user.notificationsEnabled === false) {
    return NextResponse.json({ notifications: [], count: 0, unreadCount: 0, disabled: true }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  }
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") || 30), 1), 50);

  const { data, error } = await db
    .from("Notification")
    .select("id,type,title,body,link,entityId,readAt,createdAt,actionType,actionPayload")
    .eq("userId", user.id)
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notifications: data || [], count: data?.length || 0, unreadCount: (data || []).filter((item) => !item.readAt).length, disabled: false }, { headers: { "Cache-Control": "no-store, private" } });
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const notificationId = typeof body.id === "string" ? body.id.trim() : "";
  const markAll = body.all === true;
  if (!notificationId && !markAll) {
    return NextResponse.json({ error: "NOTIFICATION_TARGET_REQUIRED", message: "Indique la notification à marquer comme lue." }, { status: 400 });
  }

  const db = adminClient();
  const user = await ensureUser(db, auth);
  const readAt = new Date().toISOString();
  let update = db.from("Notification")
    .update({ readAt, openedAt: readAt })
    .eq("userId", user.id)
    .is("readAt", null);
  if (notificationId) update = update.eq("id", notificationId);

  const { data, error } = await update.select("id,readAt");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated: data?.length || 0, readAt });
}

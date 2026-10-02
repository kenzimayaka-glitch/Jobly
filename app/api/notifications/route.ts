import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const db = adminClient();
  const user = await ensureUser(db, auth);
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") || 30), 1), 50);

  const { data, error } = await db
    .from("Notification")
    .select("id,type,title,body,link,entityId,readAt,createdAt,actionType,actionPayload")
    .eq("userId", user.id)
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notifications: data || [], count: data?.length || 0 });
}

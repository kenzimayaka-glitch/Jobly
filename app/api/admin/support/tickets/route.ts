import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const STATUSES = new Set(["OPEN","IN_PROGRESS","WAITING_USER","RESOLVED","CLOSED"]);

async function requireAdmin(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return { response: NextResponse.json({ message: "Session requise." }, { status: 401 }) };
  const db = adminClient();
  const user = await ensureUser(db, auth);
  if (String(user.role).toUpperCase() !== "ADMIN") return { response: NextResponse.json({ message: "Espace ADMIN requis." }, { status: 403 }) };
  const { data: identity, error } = await db.from("AdminIdentity").select("active")
    .eq("authUserId", auth.id).eq("ownerUserId", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!identity?.active) return { response: NextResponse.json({ message: "Identité ADMIN maître inactive." }, { status: 403 }) };
  return { db, user };
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireAdmin(request);
    if ("response" in access) return access.response;
    const status = String(request.nextUrl.searchParams.get("status") || "ALL").toUpperCase();
    if (status !== "ALL" && !STATUSES.has(status)) return NextResponse.json({ message: "Filtre invalide." }, { status: 400 });
    let query = access.db.from("AdminSupportTicket").select("*").order("lastMessageAt", { ascending: false }).limit(150);
    if (status !== "ALL") query = query.eq("status", status);
    const { data: tickets, error } = await query;
    if (error) throw new Error(error.message);
    const rows = tickets || [];
    if (!rows.length) return NextResponse.json({ tickets: [] });
    const requesterIds = [...new Set(rows.map((ticket: {requesterUserId:string}) => ticket.requesterUserId))];
    const ticketIds = rows.map((ticket: {id:string}) => ticket.id);
    const [{data: users,error:userError},{data: messages,error:messageError}] = await Promise.all([
      access.db.from("User").select("id,email,displayName,role,phone").in("id", requesterIds),
      access.db.from("AdminSupportTicketMessage").select("id,ticketId,authorUserId,authorRole,body,isInternal,createdAt")
        .in("ticketId", ticketIds).order("createdAt", { ascending: true }),
    ]);
    if (userError) throw new Error(userError.message);
    if (messageError) throw new Error(messageError.message);
    return NextResponse.json({ tickets: rows.map((ticket: Record<string, unknown>) => ({
      ...ticket,
      requester: (users || []).find((person: {id:string}) => person.id === ticket.requesterUserId) || null,
      messages: (messages || []).filter((message: {ticketId:string}) => message.ticketId === ticket.id),
    })) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "File Support indisponible." }, { status: 500 });
  }
}

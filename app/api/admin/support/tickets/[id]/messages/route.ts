import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const admin = await ensureUser(db, auth);
    if (String(admin.role).toUpperCase() !== "ADMIN") return NextResponse.json({ message: "Espace ADMIN requis." }, { status: 403 });
    const { data: identity, error: identityError } = await db.from("AdminIdentity").select("active")
      .eq("authUserId", auth.id).eq("ownerUserId", admin.id).maybeSingle();
    if (identityError) throw new Error(identityError.message);
    if (!identity?.active) return NextResponse.json({ message: "Identité ADMIN maître inactive." }, { status: 403 });
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const text = typeof body.body === "string" ? body.body.trim().slice(0, 5000) : "";
    if (text.length < 2) return NextResponse.json({ message: "Message trop court." }, { status: 400 });
    const internal = body.isInternal === true;
    const { data: ticket, error: ticketError } = await db.from("AdminSupportTicket").select("id,status")
      .eq("id", id).maybeSingle();
    if (ticketError) throw new Error(ticketError.message);
    if (!ticket) return NextResponse.json({ message: "Ticket introuvable." }, { status: 404 });
    const now = new Date().toISOString();
    const { data: message, error } = await db.from("AdminSupportTicketMessage").insert({
      id: crypto.randomUUID(), ticketId: id, authorUserId: admin.id,
      authorRole: "ADMIN", body: text, isInternal: internal, createdAt: now,
    }).select("*").single();
    if (error) throw new Error(error.message);
    const update = { lastMessageAt: now, updatedAt: now, ...(internal ? {} : { status: "WAITING_USER" }) };
    const { error: updateError } = await db.from("AdminSupportTicket").update(update).eq("id", id);
    if (updateError) throw new Error(updateError.message);
    return NextResponse.json({ message, ticketStatus: internal ? ticket.status : "WAITING_USER" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Envoi impossible." }, { status: 500 });
  }
}

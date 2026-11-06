import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const message = typeof body.body === "string" ? body.body.trim().slice(0, 5000) : "";
    if (message.length < 2) return NextResponse.json({ message: "Message trop court." }, { status: 400 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const { data: ticket, error } = await db.from("AdminSupportTicket").select("id,status,requesterUserId")
      .eq("id", id).eq("requesterUserId", user.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!ticket) return NextResponse.json({ message: "Demande introuvable." }, { status: 404 });
    if (["RESOLVED","CLOSED"].includes(String(ticket.status))) return NextResponse.json({ message: "Cette demande est clôturée." }, { status: 409 });
    const now = new Date().toISOString();
    const { data, error: insertError } = await db.from("AdminSupportTicketMessage").insert({
      id: crypto.randomUUID(), ticketId: id, authorUserId: user.id,
      authorRole: String(user.role || "TALENT"), body: message, isInternal: false, createdAt: now,
    }).select("id,ticketId,authorRole,body,createdAt").single();
    if (insertError) throw new Error(insertError.message);
    const { error: updateError } = await db.from("AdminSupportTicket").update({
      status: "OPEN", lastMessageAt: now, updatedAt: now, resolvedAt: null,
    }).eq("id", id);
    if (updateError) throw new Error(updateError.message);
    return NextResponse.json({ message: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Envoi du message impossible." }, { status: 500 });
  }
}

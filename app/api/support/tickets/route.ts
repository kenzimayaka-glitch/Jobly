import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CATEGORIES = new Set(["GENERAL","ACCOUNT","PAYMENT","APPLICATION","RECRUITER","PARTNER","MOBILITY","COMMUNITY","TECHNICAL"]);

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const { data: tickets, error } = await db.from("AdminSupportTicket")
      .select("id,subject,category,priority,status,source,createdAt,updatedAt,lastMessageAt,resolvedAt")
      .eq("requesterUserId", user.id)
      .order("lastMessageAt", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    const rows = tickets || [];
    if (!rows.length) return NextResponse.json({ tickets: [] });
    const { data: messages, error: messageError } = await db.from("AdminSupportTicketMessage")
      .select("id,ticketId,authorRole,body,createdAt")
      .in("ticketId", rows.map((item: {id:string}) => item.id))
      .eq("isInternal", false)
      .order("createdAt", { ascending: true });
    if (messageError) throw new Error(messageError.message);
    return NextResponse.json({ tickets: rows.map((ticket: Record<string, unknown>) => ({
      ...ticket,
      messages: (messages || []).filter((message: {ticketId:string}) => message.ticketId === ticket.id),
    })) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Tickets indisponibles." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Connectez-vous pour ouvrir une demande Support." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 180) : "";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 5000) : "";
    const category = typeof body.category === "string" ? body.category.trim().toUpperCase() : "GENERAL";
    if (!subject || subject.length < 4 || !description || description.length < 10 || !CATEGORIES.has(category)) {
      return NextResponse.json({ message: "Sujet (4 caractères minimum), description (10 caractères minimum) et catégorie valide sont requis." }, { status: 400 });
    }
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const { data: ticket, error } = await db.from("AdminSupportTicket").insert({
      id, requesterUserId: user.id, subject, category, priority: "NORMAL",
      status: "OPEN", source: "IN_APP", lastMessageAt: now, updatedAt: now,
    }).select("id,subject,category,priority,status,createdAt,lastMessageAt").single();
    if (error) throw new Error(error.message);
    const { error: messageError } = await db.from("AdminSupportTicketMessage").insert({
      id: crypto.randomUUID(), ticketId: id, authorUserId: user.id, authorRole: String(user.role || "TALENT"),
      body: description, isInternal: false, createdAt: now,
    });
    if (messageError) {
      await db.from("AdminSupportTicket").delete().eq("id", id);
      throw new Error(messageError.message);
    }
    await db.from("AuditLog").insert({
      id: crypto.randomUUID(), userId: user.id, action: "SUPPORT_TICKET_CREATED",
      entityType: "AdminSupportTicket", entityId: id, metadata: { category, source: "IN_APP" },
    });
    return NextResponse.json({ ticket, message: "Votre demande est transmise au Support Jobly." }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Création de la demande impossible." }, { status: 500 });
  }
}

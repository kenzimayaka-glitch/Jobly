import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId } from "@/lib/server-auth";
import { getJiaAvailableEcosystems, isJiaEcosystem } from "@/lib/jia/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_MAX = 100;
const MESSAGE_MAX = 24_000;
const WORKSPACE_MAX = 120_000;
const WORKSPACE_KINDS = new Set(["offers", "applications", "profile", "questionnaire", "prepared-application", "business-summary", "notice"]);

async function loadContext(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return { response: NextResponse.json({ message: "Session requise." }, { status: 401 }) } as const;
  const db = adminClient();
  const user = await ensureUser(db, auth);
  if (!user.privacyAcceptedAt) {
    return { response: NextResponse.json({ message: "Le consentement de confidentialité est requis pour J’IA." }, { status: 403 }) } as const;
  }
  const ecosystems = await getJiaAvailableEcosystems(db, user, auth.id);
  return { db, user, ecosystems } as const;
}

function sanitizeSources(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const source = item as Record<string, unknown>;
    const url = typeof source.url === "string" ? source.url.trim() : "";
    if (!/^https?:\/\//i.test(url)) return [];
    return [{
      title: typeof source.title === "string" ? source.title.slice(0, 300) : url,
      url,
      ...(typeof source.snippet === "string" ? { snippet: source.snippet.slice(0, 1200) } : {}),
    }];
  });
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await loadContext(request);
    if ("response" in ctx) return ctx.response;
    const ecosystemValue = request.nextUrl.searchParams.get("ecosystem")?.toUpperCase();
    if (!isJiaEcosystem(ecosystemValue) || !ctx.ecosystems.includes(ecosystemValue)) {
      return NextResponse.json({ message: "Cet espace J’IA n'est pas autorisé pour ce compte." }, { status: 403 });
    }

    const requestedConversationId = request.nextUrl.searchParams.get("conversationId");
    let query = ctx.db.from("JiaConversation")
      .select("id,userId,ecosystem,title,lastMessageAt,createdAt,updatedAt")
      .eq("userId", ctx.user.id)
      .eq("ecosystem", ecosystemValue)
      .is("archivedAt", null);
    if (requestedConversationId) {
      query = query.eq("id", requestedConversationId);
    } else {
      const requestedTitle = request.nextUrl.searchParams.get("title")?.trim();
      if (requestedTitle) query = query.eq("title", requestedTitle.slice(0, 80));
      query = query.order("lastMessageAt", { ascending: false });
    }
    const { data: conversation, error: conversationError } = await query.limit(1).maybeSingle();
    if (conversationError) throw new Error(conversationError.message);
    if (!conversation) return NextResponse.json({ conversation: null, messages: [], hasMore: false });

    const rawLimit = Number(request.nextUrl.searchParams.get("limit") || 50);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(PAGE_MAX, Math.floor(rawLimit))) : 50;
    const before = request.nextUrl.searchParams.get("before");
    const beforeId = request.nextUrl.searchParams.get("beforeId");
    let messagesQuery = ctx.db.from("JiaConversationMessage")
      .select("id,conversationId,role,content,sources,workspace,payloadVersion,createdAt")
      .eq("conversationId", conversation.id)
      .order("createdAt", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);
    if (before) {
      const date = new Date(before);
      if (Number.isNaN(date.getTime())) return NextResponse.json({ message: "Curseur d'historique invalide." }, { status: 400 });
      if (beforeId) {
        messagesQuery = messagesQuery.or(`createdAt.lt.${date.toISOString()},and(createdAt.eq.${date.toISOString()},id.lt.${beforeId})`);
      } else {
        messagesQuery = messagesQuery.lt("createdAt", date.toISOString());
      }
    }
    const { data, error } = await messagesQuery;
    if (error) throw new Error(error.message);
    const rows = data || [];
    const hasMore = rows.length > limit;
    return NextResponse.json({
      conversation,
      messages: rows.slice(0, limit).reverse(),
      hasMore,
      nextCursor: rows.length > 0 ? { before: rows[Math.min(limit, rows.length) - 1].createdAt, beforeId: rows[Math.min(limit, rows.length) - 1].id } : null,
    });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Impossible de restaurer la conversation J’IA.",
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await loadContext(request);
    if ("response" in ctx) return ctx.response;
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "");
    const requestedEcosystem = String(body.ecosystem || "").toUpperCase();

    if (action === "create") {
      if (!isJiaEcosystem(requestedEcosystem) || !ctx.ecosystems.includes(requestedEcosystem)) {
        return NextResponse.json({ message: "Cet espace J’IA n'est pas autorisé pour ce compte." }, { status: 403 });
      }
      const now = new Date().toISOString();
      const requestedTitle = typeof body.title === "string" ? body.title.trim().slice(0, 80) : "";
      const { data, error } = await ctx.db.from("JiaConversation").insert({
        id: newId(),
        userId: ctx.user.id,
        ecosystem: requestedEcosystem,
        title: requestedTitle || "Conversation J’IA",
        lastMessageAt: now,
        updatedAt: now,
      }).select("id,userId,ecosystem,title,lastMessageAt,createdAt,updatedAt").single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ conversation: data }, { status: 201 });
    }

    const conversationId = typeof body.conversationId === "string" ? body.conversationId : "";
    if (!conversationId) return NextResponse.json({ message: "conversationId requis." }, { status: 400 });
    const { data: conversation, error: ownerError } = await ctx.db.from("JiaConversation")
      .select("id,userId,ecosystem,title")
      .eq("id", conversationId)
      .eq("userId", ctx.user.id)
      .is("archivedAt", null)
      .maybeSingle();
    if (ownerError) throw new Error(ownerError.message);
    if (!conversation) return NextResponse.json({ message: "Conversation introuvable." }, { status: 404 });
    if (!ctx.ecosystems.includes(conversation.ecosystem)) {
      return NextResponse.json({ message: "Cet espace J’IA n'est pas autorisé pour ce compte." }, { status: 403 });
    }

    if (action === "append") {
      const input = body.message && typeof body.message === "object" ? body.message as Record<string, unknown> : {};
      const role = input.role === "user" || input.role === "assistant" ? input.role : null;
      const content = typeof input.text === "string" ? input.text.trim() : "";
      const clientMessageId = typeof input.id === "string" ? input.id.trim() : "";
      const workspaceJson = input.workspace && typeof input.workspace === "object" ? input.workspace : null;
      if (!role || !content || content.length > MESSAGE_MAX || !clientMessageId || clientMessageId.length > 128) {
        return NextResponse.json({ message: "Message invalide ou trop long." }, { status: 400 });
      }
      if (workspaceJson) {
        const kind = String((workspaceJson as Record<string, unknown>).kind || "");
        if (!WORKSPACE_KINDS.has(kind) || JSON.stringify(workspaceJson).length > WORKSPACE_MAX) {
          return NextResponse.json({ message: "Bloc conversationnel invalide ou trop volumineux." }, { status: 400 });
        }
      }
      const { data, error } = await ctx.db.from("JiaConversationMessage").insert({
        id: clientMessageId,
        conversationId,
        role,
        content,
        sources: sanitizeSources(input.sources),
        workspace: workspaceJson,
        payloadVersion: 1,
        clientMessageId,
      }).select("id,conversationId,role,content,sources,workspace,payloadVersion,createdAt").single();
      let saved = data;
      if (error) {
        const { data: existing, error: existingError } = await ctx.db.from("JiaConversationMessage")
          .select("id,conversationId,role,content,sources,workspace,payloadVersion,createdAt")
          .eq("conversationId", conversationId)
          .eq("clientMessageId", clientMessageId)
          .maybeSingle();
        if (existingError || !existing) throw new Error(existingError?.message || error.message);
        saved = existing;
      }
      const now = new Date().toISOString();
      const updates: Record<string, unknown> = { lastMessageAt: now, updatedAt: now };
      if (role === "user" && (!conversation.title || conversation.title === "Conversation J’IA")) {
        updates.title = content.slice(0, 80);
      }
      const { error: updateError } = await ctx.db.from("JiaConversation").update(updates)
        .eq("id", conversationId).eq("userId", ctx.user.id);
      if (updateError) throw new Error(updateError.message);
      return NextResponse.json({ message: saved });
    }

    if (action === "update-workspace") {
      const messageId = typeof body.messageId === "string" ? body.messageId : "";
      const workspaceValue = body.workspace && typeof body.workspace === "object" ? body.workspace : null;
      const workspaceString = workspaceValue ? JSON.stringify(workspaceValue) : "";
      const kind = workspaceValue ? String((workspaceValue as Record<string, unknown>).kind || "") : "";
      if (!messageId || !workspaceValue || !WORKSPACE_KINDS.has(kind) || workspaceString.length > WORKSPACE_MAX) {
        return NextResponse.json({ message: "État de carte invalide ou trop volumineux." }, { status: 400 });
      }
      const { data, error } = await ctx.db.from("JiaConversationMessage").update({ workspace: workspaceValue })
        .eq("id", messageId)
        .eq("conversationId", conversationId)
        .eq("role", "assistant")
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return NextResponse.json({ message: "Message introuvable dans cette conversation." }, { status: 404 });
      const { error: updateError } = await ctx.db.from("JiaConversation").update({ updatedAt: new Date().toISOString() })
        .eq("id", conversationId).eq("userId", ctx.user.id);
      if (updateError) throw new Error(updateError.message);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ message: "Action de conversation inconnue." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Impossible d'enregistrer la conversation J’IA.",
    }, { status: 500 });
  }
}

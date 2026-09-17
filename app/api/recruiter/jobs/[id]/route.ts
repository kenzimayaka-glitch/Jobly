import { NextRequest, NextResponse } from "next/server";
import { adminClient, cleanStrings, ensureUser, getAuthUser } from "../../../../../lib/server-auth";

type RouteContext = { params: Promise<{ id: string }> };

async function loadOwnedJob(supabase: ReturnType<typeof adminClient>, userId: string, jobId: string) {
  const { data, error } = await supabase
    .from("RecruiterJob")
    .select("*")
    .eq("id", jobId)
    .eq("recruiterUserId", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const job = await loadOwnedJob(supabase, user.id, id);
    if (!job) return NextResponse.json({ message: "Offre introuvable." }, { status: 404 });
    return NextResponse.json({ job });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Erreur." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const existing = await loadOwnedJob(supabase, user.id, id);
    if (!existing) return NextResponse.json({ message: "Offre introuvable." }, { status: 404 });

    const b = await req.json();
    const payload: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (typeof b.title === "string") {
      const title = b.title.trim();
      if (!title) return NextResponse.json({ message: "Le titre est obligatoire." }, { status: 400 });
      payload.title = title;
    }
    if (typeof b.description === "string") {
      const description = b.description.trim();
      if (!description) return NextResponse.json({ message: "La description est obligatoire." }, { status: 400 });
      payload.description = description;
    }
    if (typeof b.location === "string") payload.location = b.location.trim() || null;
    if (typeof b.mode === "string") payload.mode = b.mode;
    if (typeof b.contract === "string") payload.contract = b.contract;
    if (typeof b.salary === "string") payload.salary = b.salary.trim() || null;
    if (typeof b.sector === "string") payload.sector = b.sector.trim() || null;
    if (Array.isArray(b.tags)) payload.tags = cleanStrings(b.tags);
    if (b.status === "draft" || b.status === "published" || b.status === "closed") payload.status = b.status;

    const { data, error } = await supabase
      .from("RecruiterJob")
      .update(payload)
      .eq("id", id)
      .eq("recruiterUserId", user.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ job: data });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Erreur." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const existing = await loadOwnedJob(supabase, user.id, id);
    if (!existing) return NextResponse.json({ message: "Offre introuvable." }, { status: 404 });

    const { error } = await supabase
      .from("RecruiterJob")
      .delete()
      .eq("id", id)
      .eq("recruiterUserId", user.id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Erreur." }, { status: 500 });
  }
}

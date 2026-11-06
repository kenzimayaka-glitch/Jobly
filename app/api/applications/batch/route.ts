import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId } from "../../../../lib/server-auth";
import { checkBulkApplicationLimit, checkWeeklyApplicationQuota } from "../../../../lib/entitlements";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const { data, error } = await supabase
      .from("ApplicationBatch")
      .select("id,createdAt,status,itemCount,ApplicationBatchItem(id,offerId,generatedSubject,generatedBody,hasCoverLetter,editedByUser,status)")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return NextResponse.json({ batches: data || [] });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de charger l'historique des candidatures groupées." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const body = await request.json().catch(() => ({}));
    const offers = Array.isArray(body.offers) ? body.offers : [];
    if (!offers.length) return NextResponse.json({ message: "Aucune offre sélectionnée." }, { status: 400 });
    if (offers.length > 20) return NextResponse.json({ message: "Un lot ne peut pas contenir plus de 20 offres." }, { status: 400 });

    const bulk = await checkBulkApplicationLimit(supabase, user.id, offers.length);
    if (!bulk.allowed) {
      return NextResponse.json({
        code: "BULK_LIMIT_EXCEEDED",
        message: bulk.message || "La postulation groupée dépasse les droits de votre formule.",
        limit: bulk.limit,
        selectedCount: offers.length,
      }, { status: 403 });
    }
    const weekly = await checkWeeklyApplicationQuota(supabase, user.id);
    const remaining = Math.max(0, weekly.limit - weekly.used);
    if (!weekly.allowed || offers.length > remaining) {
      return NextResponse.json({
        code: "APPLICATION_QUOTA_EXCEEDED",
        message: weekly.message || `Il reste ${remaining} candidature(s) dans votre quota hebdomadaire.`,
        limit: weekly.limit,
        used: weekly.used,
        remaining,
        selectedCount: offers.length,
      }, { status: 429 });
    }

    const batchId = newId();
    const { error: batchError } = await supabase.from("ApplicationBatch").insert({
      id: batchId,
      userId: user.id,
      status: "GENERATING",
      itemCount: offers.length,
    });
    if (batchError) throw new Error(batchError.message);

    const items = offers.map((offer: any) => ({
      id: newId(),
      batchId,
      offerId: typeof offer.offerId === "string" ? offer.offerId : null,
      generatedSubject: null,
      generatedBody: null,
      hasCoverLetter: Boolean(offer.requiresCoverLetter),
      editedByUser: false,
      status: "DRAFT",
    }));
    const { data, error } = await supabase.from("ApplicationBatchItem").insert(items).select("id,batchId,offerId,status");
    if (error) {
      await supabase.from("ApplicationBatch").delete().eq("id", batchId).eq("userId", user.id);
      throw new Error(error.message);
    }
    return NextResponse.json({ batch: { id: batchId, status: "GENERATING", itemCount: offers.length }, items: data || [] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de créer le lot de candidatures." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const body = await request.json().catch(() => ({}));
    const batchId = typeof body.batchId === "string" ? body.batchId : "";
    const status = typeof body.status === "string" ? body.status : "";
    if (!batchId || !["READY_FOR_REVIEW","SENDING","COMPLETED","PARTIAL_FAILURE"].includes(status)) {
      return NextResponse.json({ message: "Mise à jour du lot invalide." }, { status: 400 });
    }
    const { data, error } = await supabase.from("ApplicationBatch").update({ status }).eq("id", batchId).eq("userId", user.id).select("id,status,itemCount").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ message: "Lot introuvable." }, { status: 404 });
    return NextResponse.json({ batch: data });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de mettre à jour le lot." }, { status: 500 });
  }
}
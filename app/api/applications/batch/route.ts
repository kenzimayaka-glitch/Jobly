import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, newId } from "../../../../lib/server-auth";

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
    const offers = Array.isArray(body.offers) ? body.offers.slice(0, 20) : [];
    if (!offers.length) return NextResponse.json({ message: "Aucune offre sélectionnée." }, { status: 400 });

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
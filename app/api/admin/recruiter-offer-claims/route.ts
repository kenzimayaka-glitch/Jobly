import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

async function requireAdmin(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return { response: NextResponse.json({ message: "Session requise." }, { status: 401 }) };
  const db = adminClient();
  const user = await ensureUser(db, auth);
  if (String(user.role).toUpperCase() !== "ADMIN") return { response: NextResponse.json({ message: "Accès réservé à ADMIN." }, { status: 403 }) };
  const { data: identity, error } = await db.from("AdminIdentity").select("active")
    .eq("authUserId", auth.id).eq("ownerUserId", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!identity?.active) return { response: NextResponse.json({ message: "Identité ADMIN maître inactive." }, { status: 403 }) };
  return { db, user };
}

export async function GET(request: NextRequest) {
  try {
    const gate = await requireAdmin(request);
    if ("response" in gate) return gate.response;
    const { data: rows, error } = await gate.db.from("RecruiterOfferClaim")
      .select("*").eq("status", "PENDING").order("createdAt", { ascending: true }).limit(100);
    if (error) throw new Error(error.message);
    const claims = rows || [];
    if (!claims.length) return NextResponse.json({ claims: [] }, { headers: { "Cache-Control": "no-store, private" } });
    const shareIds = [...new Set(claims.map((x: any) => x.sourceShareId))];
    const jobIds = [...new Set(claims.map((x: any) => x.sourceJobId))];
    const appIds = [...new Set(claims.map((x: any) => x.applicationId))];
    const userIds = [...new Set(claims.map((x: any) => x.recruiterUserId))];
    const [shares, jobs, apps, users] = await Promise.all([
      gate.db.from("CVShare").select("id,jobTitleSnapshot,companyNameSnapshot,source").in("id", shareIds),
      gate.db.from("Job").select("id,title,location,description").in("id", jobIds),
      gate.db.from("Application").select("id,userId,status").in("id", appIds),
      gate.db.from("User").select("id,displayName,email,phone,signupPhone").in("id", userIds),
    ]);
    for (const result of [shares,jobs,apps,users]) if (result.error) throw new Error(result.error.message);
    const mapped = claims.map((claim: any) => ({
      ...claim,
      share: (shares.data || []).find((x: any) => x.id === claim.sourceShareId) || null,
      job: (jobs.data || []).find((x: any) => x.id === claim.sourceJobId) || null,
      application: (apps.data || []).find((x: any) => x.id === claim.applicationId) || null,
      recruiter: (users.data || []).find((x: any) => x.id === claim.recruiterUserId) || null,
    }));
    return NextResponse.json({ claims: mapped }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "File de vérification indisponible." }, { status: 500, headers: { "Cache-Control": "no-store, private" } });
  }
}

export async function POST(request: NextRequest) {
  try {
    const gate = await requireAdmin(request);
    if ("response" in gate) return gate.response;
    const body = await request.json().catch(() => ({}));
    const claimId = typeof body.claimId === "string" ? body.claimId : "";
    const decision = String(body.decision || "").toUpperCase();
    const approved = decision === "APPROVE";
    const note = String(body.reviewNote || "").trim().slice(0,1000);
    if (!/^[0-9a-f-]{36}$/i.test(claimId)) return NextResponse.json({ message: "Réclamation invalide." }, { status: 400 });
    if (!approved && decision !== "REJECT") return NextResponse.json({ message: "Décision invalide." }, { status: 422 });
    if (!approved && note.length < 4) return NextResponse.json({ message: "Le motif du rejet est obligatoire." }, { status: 422 });
    const { data, error } = await gate.db.rpc("review_whatsapp_recruiter_offer_claim", {
      p_claim_id: claimId,p_admin_user_id: gate.user.id,p_approved: approved,p_review_note: note || null,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ result: data, message: approved ? "Rattachement vérifié et effectué." : "Réclamation rejetée." }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Décision impossible.";
    const status = message.includes("NOT_FOUND") ? 404 : message.includes("ALREADY_REVIEWED") ? 409 : message.includes("FORBIDDEN") ? 403 : 500;
    return NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store, private" } });
  }
}

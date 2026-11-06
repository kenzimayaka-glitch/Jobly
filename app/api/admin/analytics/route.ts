import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function countSource(db: ReturnType<typeof adminClient>, table: string) {
  try {
    const { count, error } = await db.from(table).select("id", { count: "exact", head: true });
    if (error) return { available: false, count: null, reason: error.message };
    return { available: true, count: count ?? 0, reason: null };
  } catch (error) {
    return { available: false, count: null, reason: error instanceof Error ? error.message : "Source indisponible." };
  }
}

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
  return { db };
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireAdmin(request);
    if ("response" in access) return access.response;
    const tables = [
      ["users","Utilisateurs","User"],
      ["opportunities","Offres importées","Job"],
      ["recruiterJobs","Offres recruteurs","RecruiterJob"],
      ["applications","Candidatures","Application"],
      ["companies","Entreprises","Company"],
      ["partners","Partenaires","Partner"],
      ["events","Événements","Event"],
      ["subscriptions","Abonnements","Subscription"],
      ["payments","Paiements","Payment"],
      ["communities","Communautés","Community"],
      ["communityPosts","Publications Community","CommunityPost"],
      ["communityMembers","Membres Community","CommunityMembership"],
      ["mobilityRequests","Demandes Mobility","MobilityRequest"],
      ["jobSources","Sources d'offres","JobSource"],
      ["harvestCaptures","Captures d'offres","JobHarvestCapture"],
      ["auditEntries","Événements d'audit","AuditLog"],
    ] as const;
    const values = await Promise.all(tables.map(async ([key,label,table]) => ({
      key, label, ...(await countSource(access.db, table)),
    })));
    const roleCounts = await Promise.all(["TALENT","RECRUITER","PARTNER","ADMIN"].map(async (role) => {
      const { count, error } = await access.db.from("User").select("id",{count:"exact",head:true}).eq("role",role);
      return { role, available: !error, count: error ? null : count ?? 0 };
    }));
    return NextResponse.json({ snapshotAt: new Date().toISOString(), metrics: values, roleCounts });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Indicateurs indisponibles." }, { status: 500 });
  }
}

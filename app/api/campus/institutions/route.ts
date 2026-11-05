import { NextRequest, NextResponse } from "next/server";
import { adminClient, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InstitutionRow = {
  id: string;
  name: string;
  city: string | null;
  type: string;
};

type MembershipRow = {
  institutionId: string;
  userId: string;
  role: string;
};

export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Session requise." }, { status: 401 });

  const db = adminClient();
  const { data, error } = await db
    .from("Institution")
    .select("id,name,city,type")
    .eq("active", true)
    .order("city", { ascending: true })
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The current production directory contains one explicitly labelled demo tenant.
  // Keep demo records out of student-facing counts and discovery.
  const institutions = ((data || []) as InstitutionRow[]).filter(
    (item) => item.name && !/\bdemo\b/i.test(item.name),
  );
  const institutionIds = institutions.map((item) => item.id);

  const memberships: MembershipRow[] = [];
  for (let from = 0; institutionIds.length; from += 1000) {
    const { data: batch, error: membershipError } = await db
      .from("InstitutionMember")
      .select("institutionId,userId,role")
      .in("institutionId", institutionIds)
      .eq("active", true)
      .range(from, from + 999);

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }
    memberships.push(...((batch || []) as MembershipRow[]));
    if (!batch || batch.length < 1000) break;
  }

  const { data: viewer, error: viewerError } = await db
    .from("User")
    .select("id")
    .eq("authUserId", auth.id)
    .maybeSingle();

  if (viewerError) return NextResponse.json({ error: viewerError.message }, { status: 500 });

  const memberCounts = new Map<string, number>();
  const viewerMemberships = new Map<string, string>();
  for (const member of memberships) {
    memberCounts.set(member.institutionId, (memberCounts.get(member.institutionId) || 0) + 1);
    if (viewer?.id && member.userId === viewer.id) {
      viewerMemberships.set(member.institutionId, member.role);
    }
  }

  const result = institutions.map((institution) => ({
    ...institution,
    memberCount: memberCounts.get(institution.id) || 0,
    isMember: viewerMemberships.has(institution.id),
    membershipRole: viewerMemberships.get(institution.id) || null,
  }));

  return NextResponse.json({
    institutions: result,
    count: result.length,
    activeMemberCount: memberships.length,
    source: "Institution + InstitutionMember",
    generatedAt: new Date().toISOString(),
  });
}

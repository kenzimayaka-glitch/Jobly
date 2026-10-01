import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../lib/server-auth";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, c: Ctx) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
  try {
    const { id } = await c.params, s = adminClient();
    const { data, error } = await s.from("RecruitmentInterview")
      .select("*,RecruitmentInterviewJury(*),RecruitmentInterviewAttendance(*),RecruitmentInterviewReminder(*)")
      .eq("id", id).single();
    if (error) return NextResponse.json({ message: "Entretien introuvable." }, { status: 404 });
    return NextResponse.json({ interview: data });
  } catch { return NextResponse.json({ message: "Erreur." }, { status: 500 }); }
}

export async function POST(req: NextRequest, c: Ctx) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
  try {
    const { id } = await c.params, b = await req.json(), s = adminClient(), u = await ensureUser(s, auth);
    if (b.action === "presence") {
      const { data, error } = await s.rpc("recruitment360_lot5_update_presence", {
        p_interview_id:id,p_actor_user_id:u.id,p_participant_user_id:b.participantUserId ?? null,
        p_status:b.status,p_role:b.role ?? "JURY"
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ attendance:data });
    }
    if (b.action === "status") {
      const { data, error } = await s.rpc("recruitment360_lot5_change_status", {
        p_interview_id:id,p_actor_user_id:u.id,p_status:b.status,p_reason:b.reason ?? null
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ interview:data });
    }
    return NextResponse.json({ message:"Action inconnue." }, { status:400 });
  } catch(e) {
    const m=e instanceof Error?e.message:"Action impossible.";
    return NextResponse.json({message:m},{status:m==="FORBIDDEN"?403:409});
  }
}
import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
  try {
    const s = adminClient(), u = await ensureUser(s, auth);
    const { data, error } = await s.from("RecruitmentInterview")
      .select("*,RecruitmentInterviewJury(*),RecruitmentInterviewAttendance(*),RecruitmentInterviewReminder(*)")
      .order("startsAt", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = [...new Set((data ?? []).map((x: any) => x.recruitmentId))];
    const { data: roles } = ids.length
      ? await s.from("RecruitmentRole").select("recruitmentId").in("recruitmentId", ids).eq("userId", u.id)
      : { data: [] as any[] };
    const allowed = new Set((roles ?? []).map((x: any) => x.recruitmentId));
    return NextResponse.json({ interviews: (data ?? []).filter((x: any) => allowed.has(x.recruitmentId)) });
  } catch (e) { return NextResponse.json({ message: e instanceof Error ? e.message : "Erreur." }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
  try {
    const s = adminClient(), u = await ensureUser(s, auth), b = await req.json(), action = b.action ?? "schedule";
    if (action === "create_slot") {
      const { data, error } = await s.rpc("recruitment360_lot5_create_slot", {
        p_recruiter_job_id: b.recruiterJobId, p_actor_user_id: u.id,
        p_starts_at: new Date(b.startsAt).toISOString(), p_ends_at: new Date(b.endsAt).toISOString(),
        p_timezone: b.timezone ?? "Africa/Douala", p_capacity: Number(b.capacity ?? 1), p_application_id: b.applicationId ?? null
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ slot: data }, { status: 201 });
    }
    if (action === "dispatch_reminders") {
      if (!process.env.RECRUITMENT360_REMINDER_SECRET || req.headers.get("x-recruitment360-reminder-secret") !== process.env.RECRUITMENT360_REMINDER_SECRET)
        return NextResponse.json({ message: "Scheduler secret requis." }, { status: 403 });
      const { data, error } = await s.rpc("recruitment360_lot5_dispatch_reminders", { p_now: new Date().toISOString() });
      if (error) throw new Error(error.message);
      return NextResponse.json({ dispatched: data });
    }
    const { data, error } = await s.rpc("recruitment360_lot5_schedule", {
      p_recruiter_job_id: b.recruiterJobId, p_actor_user_id: u.id, p_application_id: b.applicationId,
      p_starts_at: new Date(b.startsAt).toISOString(), p_ends_at: new Date(b.endsAt).toISOString(),
      p_timezone: b.timezone ?? "Africa/Douala", p_title: b.title ?? "Entretien Jobly",
      p_meeting_provider: b.meetingProvider ?? "EXTERNAL", p_meeting_url: b.meetingUrl ?? null,
      p_location: b.location ?? null, p_notes: b.notes ?? null, p_slot_id: b.slotId ?? null,
      p_jury: Array.isArray(b.jury) ? b.jury : []
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ interview: data }, { status: 201 });
  } catch (e) {
    const m = e instanceof Error ? e.message : "Erreur.";
    return NextResponse.json({ message: m }, { status: m === "FORBIDDEN" ? 403 : m.includes("INVALID") || m.includes("REQUIRED") ? 400 : 409 });
  }
}
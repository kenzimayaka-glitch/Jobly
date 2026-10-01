import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../../../lib/server-auth";

type Ctx = { params: Promise<{ id: string }> };

function parseSalary(value: unknown) {
  if (typeof value !== "string") return { min: null, max: null };
  const nums = value.replace(/\u00a0/g, " ").match(/\d[\d\s.,]*/g)?.map((x) => Number(x.replace(/\s/g, "").replace(/\./g, "").replace(",", "."))).filter(Number.isFinite) || [];
  return { min: nums[0] ?? null, max: nums[1] ?? nums[0] ?? null };
}

function criteriaFromBody(body: Record<string, unknown>) {
  const raw = Array.isArray(body.criteria) ? body.criteria : [];
  return raw.map((item, index) => {
    if (typeof item === "string") return { criterion: item.trim().toUpperCase().replace(/\s+/g, "_"), label: item.trim(), required: false, weight: 1, sortOrder: index };
    const x = item as Record<string, unknown>;
    const label = typeof x.label === "string" ? x.label.trim() : "";
    const criterion = typeof x.criterion === "string" ? x.criterion.trim().toUpperCase().replace(/\s+/g, "_") : label.toUpperCase().replace(/\s+/g, "_");
    return { criterion, label: label || criterion, required: Boolean(x.required), weight: Number(x.weight) || 1, sortOrder: index };
  }).filter((x) => x.criterion && x.label);
}

export async function GET(req: NextRequest, context: Ctx) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const { id } = await context.params;
    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const { data: recruitment, error: rError } = await supabase.from("Recruitment360").select("*").eq("recruiterJobId", id).maybeSingle();
    if (rError) throw new Error(rError.message);
    if (!recruitment) return NextResponse.json({ message: "Recrutement introuvable." }, { status: 404 });
    const { data: role } = await supabase.from("RecruitmentRole").select("role").eq("recruitmentId", recruitment.id).eq("userId", user.id).in("role", ["OWNER","HR","MANAGER","DELEGATE"]).limit(1).maybeSingle();
    if (!role) return NextResponse.json({ message: "Accès refusé." }, { status: 403 });
    const [versions, criteria, events] = await Promise.all([
      supabase.from("RecruitmentAnnouncementVersion").select("*").eq("recruitmentId", recruitment.id).order("versionNumber", { ascending: false }),
      supabase.from("RecruitmentCriterion").select("*").in("versionId", (await supabase.from("RecruitmentAnnouncementVersion").select("id").eq("recruitmentId", recruitment.id)).data?.map((v) => v.id) || []),
      supabase.from("RecruitmentPublicationEvent").select("*").eq("recruitmentId", recruitment.id).order("createdAt", { ascending: false }).limit(50),
    ]);
    if (versions.error) throw new Error(versions.error.message);
    if (criteria.error) throw new Error(criteria.error.message);
    if (events.error) throw new Error(events.error.message);
    return NextResponse.json({ recruitment, versions: versions.data || [], criteria: criteria.data || [], events: events.data || [] });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Erreur." }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: Ctx) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const { id } = await context.params;
    const body = await req.json() as Record<string, unknown>;
    const supabase = adminClient();
    const user = await ensureUser(supabase, auth);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    if (!title || !description) return NextResponse.json({ message: "Le titre et la description sont obligatoires." }, { status: 400 });
    const salary = parseSalary(body.salary);
    const deadlineAt = typeof body.deadlineAt === "string" && body.deadlineAt ? new Date(body.deadlineAt).toISOString() : null;
    const criteria = criteriaFromBody(body);
    const { data, error } = await supabase.rpc("recruitment360_lot2_create_version", {
      p_recruiter_job_id: id,
      p_actor_user_id: user.id,
      p_title: title,
      p_description: description,
      p_salary_min: salary.min,
      p_salary_max: salary.max,
      p_salary_currency: "XAF",
      p_salary_visible: body.salaryVisible !== false,
      p_deadline_at: deadlineAt,
      p_criteria: criteria,
    });
    if (error) {
      const status = error.message === "FORBIDDEN" ? 403 : error.message.includes("RECRUITMENT_NOT_FOUND") ? 404 : 409;
      return NextResponse.json({ message: error.message }, { status });
    }
    return NextResponse.json({ versionId: data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Création de version impossible." }, { status: 500 });
  }
}
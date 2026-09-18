import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const source = body?.source === "recruiter" ? "recruiter" : "discovery";
    const jobId = typeof body?.jobId === "string" ? body.jobId : null;
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const [{ data: profile, error: profileError }] = await Promise.all([
      supabase.from("Profile").select("*").eq("userId", user.id).maybeSingle(),
    ]);
    if (profileError) throw new Error(profileError.message);

    let job: any = null;
    if (jobId) {
      const result = source === "recruiter"
        ? await supabase.from("RecruiterJob").select("id,title,companyName").eq("id", jobId).maybeSingle()
        : await supabase.from("Job").select("id,title,companyId,Company:companyId(name)").eq("id", jobId).maybeSingle();
      if (result.error) throw new Error(result.error.message);
      job = result.data;
    }

    const candidateName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || user.displayName || "Talent Jobly";
    const companyName = source === "recruiter" ? job?.companyName || null : job?.Company?.name || null;
    const token = nanoid(32);
    const { error } = await supabase.from("CVShare").insert({
      token, userId: user.id, jobId, source,
      candidateNameSnapshot: candidateName,
      jobTitleSnapshot: job?.title || null,
      companyNameSnapshot: companyName,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, token, candidateName, jobTitle: job?.title || null, companyName });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de créer le partage CV." }, { status: 500 });
  }
}

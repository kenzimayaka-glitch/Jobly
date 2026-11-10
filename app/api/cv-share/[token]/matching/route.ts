import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/server-auth";
import { analyzeATSMatch } from "@/lib/atsService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function buildCvText(profile: any, skills: any[], experiences: any[], education: any[]) {
  return [
    profile?.headline,
    profile?.summary,
    profile?.experienceSummary,
    profile?.educationSummary,
    ...(Array.isArray(profile?.targetRoles) ? profile.targetRoles : []),
    ...skills.map((item) => [item.name, item.level].filter(Boolean).join(" ")),
    ...experiences.map((item) => [item.title, item.company, item.description].filter(Boolean).join(" ")),
    ...education.map((item) => [item.degree, item.field, item.institution].filter(Boolean).join(" ")),
  ].filter(Boolean).join("\n");
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const db = adminClient();
    const { data: share, error: shareError } = await db.from("CVShare")
      .select("id,token,userId,jobId,source,expiresAt,revokedAt")
      .eq("token", token)
      .maybeSingle();
    if (shareError || !share || share.revokedAt || (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now())) {
      return NextResponse.json({ message: "Ce partage CV n'est plus disponible." }, { status: 404, headers: { "Cache-Control": "no-store, private" } });
    }

    const source = typeof share.source === "string" ? share.source : "";
    const applicationMatch = source.match(/^WHATSAPP_APPLICATION:([0-9a-f-]{36})$/i);
    if (!applicationMatch) return NextResponse.json({ message: "Ce partage ne comporte pas de contexte de matching." }, { status: 404 });

    const { data: application, error: applicationError } = await db.from("Application")
      .select("id,userId,jobId,recruiterJobId,tailoredCvText")
      .eq("id", applicationMatch[1])
      .eq("userId", share.userId)
      .maybeSingle();
    if (applicationError) throw new Error(applicationError.message);
    const relationValid = Boolean(application && (
      (application.jobId && share.jobId === application.jobId) ||
      (application.recruiterJobId && !share.jobId)
    ));
    if (!relationValid || !String(application?.tailoredCvText || "").trim()) {
      return NextResponse.json({ message: "Le contexte de candidature n'est plus disponible." }, { status: 404 });
    }

    const offerTable = application.jobId ? "Job" : "RecruiterJob";
    const offerId = application.jobId || application.recruiterJobId;
    const { data: offer, error: offerError } = await db.from(offerTable)
      .select("title,description,tags,aiSkills")
      .eq("id", offerId)
      .maybeSingle();
    if (offerError) throw new Error(offerError.message);
    if (!offer) return NextResponse.json({ message: "L'offre liée n'est plus disponible." }, { status: 404 });

    const jobText = [offer.title, offer.description, ...(offer.tags || []), ...(Array.isArray(offer.aiSkills) ? offer.aiSkills : [])].filter(Boolean).join("\n");
    const triggerScore = analyzeATSMatch(String(application.tailoredCvText), jobText).score;
    if (triggerScore === null) {
      return NextResponse.json({ matchingAvailable: false, higherScoreCount: null }, { headers: { "Cache-Control": "no-store, private" } });
    }

    // Only profiles whose owners explicitly enabled public discoverability are eligible.
    // The endpoint returns one aggregate count; no candidate identifiers or scores leave the server.
    let profiles: any[] = [];
    const pageSize = 500;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await db.from("Profile")
        .select("userId,headline,summary,experienceSummary,educationSummary,targetRoles")
        .eq("publicDiscoverable", true)
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      profiles = profiles.concat(data || []);
      if (!data || data.length < pageSize) break;
    }

    const userIds = Array.from(new Set(profiles.map((item) => String(item.userId || "")).filter(Boolean)))
      .filter((id) => id !== String(share.userId));
    if (!userIds.length) return NextResponse.json({ matchingAvailable: true, higherScoreCount: 0 }, { headers: { "Cache-Control": "no-store, private" } });

    let higherScoreCount = 0;
    const batchSize = 100;
    for (let offset = 0; offset < userIds.length; offset += batchSize) {
      const ids = userIds.slice(offset, offset + batchSize);
      const [usersRes, skillsRes, experiencesRes, educationRes] = await Promise.all([
        db.from("User").select("id").in("id", ids).eq("role", "TALENT"),
        db.from("Skill").select("userId,name,level").in("userId", ids),
        db.from("Experience").select("userId,title,company,description").in("userId", ids),
        db.from("Education").select("userId,degree,field,institution").in("userId", ids),
      ]);
      for (const result of [usersRes, skillsRes, experiencesRes, educationRes]) {
        if (result.error) throw new Error(result.error.message);
      }
      const talentIds = new Set((usersRes.data || []).map((item) => String(item.id)));
      const skillsByUser = new Map<string, any[]>();
      const experiencesByUser = new Map<string, any[]>();
      const educationByUser = new Map<string, any[]>();
      for (const item of skillsRes.data || []) skillsByUser.set(item.userId, [...(skillsByUser.get(item.userId) || []), item]);
      for (const item of experiencesRes.data || []) experiencesByUser.set(item.userId, [...(experiencesByUser.get(item.userId) || []), item]);
      for (const item of educationRes.data || []) educationByUser.set(item.userId, [...(educationByUser.get(item.userId) || []), item]);

      for (const profile of profiles) {
        const userId = String(profile.userId || "");
        if (!talentIds.has(userId) || !ids.includes(userId)) continue;
        const cvText = buildCvText(profile, skillsByUser.get(userId) || [], experiencesByUser.get(userId) || [], educationByUser.get(userId) || []);
        const score = analyzeATSMatch(cvText, jobText).score;
        if (score !== null && score > triggerScore) higherScoreCount += 1;
      }
    }

    return NextResponse.json({
      matchingAvailable: true,
      higherScoreCount,
      comparison: "STRICTLY_HIGHER_THAN_TRIGGERING_TALENT",
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Le compteur de matching est indisponible.",
    }, { status: 500, headers: { "Cache-Control": "no-store, private" } });
  }
}

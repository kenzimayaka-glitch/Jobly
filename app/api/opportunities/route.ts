import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../lib/server-auth";
import { enforceApiRateLimit } from "../../../lib/server-security";
import { scoreJobMatch, type MatchingCandidate } from "../../../lib/matchingEngine";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const sb = adminClient();
    const readLimit = await enforceApiRateLimit(req, sb, {
      scope: "opportunities-read",
      identity: `user:${auth.id}`,
      accountWindows: [{ limit: 20, windowSeconds: 60 }, { limit: 240, windowSeconds: 3600 }],
      ipWindows: [{ limit: 120, windowSeconds: 60 }, { limit: 900, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (readLimit) return readLimit;

    const user = await ensureUser(sb, auth);
    const [profileRes, skillsRes, experiencesRes, educationRes, jobsRes] = await Promise.all([
      sb.from("Profile").select("headline,summary,location,targetRoles,targetCities,contractPreferences,remotePreference,preferredSectors").eq("userId", user.id).maybeSingle(),
      sb.from("Skill").select("name,level,provenance").eq("userId", user.id).limit(60),
      sb.from("Experience").select("title,description,startDate,endDate").eq("userId", user.id).limit(30),
      sb.from("Education").select("degree,field,institution").eq("userId", user.id).limit(20),
      sb.from("Job").select("id,title,description,location,contractType,remoteMode,minExperienceYears,companyId,isActive,tags,aiSkills,aiSector,opportunityType,normalizedContent,source,sourceUrl,deadline,sourcePublishedAt,qualityStatus").eq("isActive", true).limit(1000),
    ]);
    for (const result of [profileRes, skillsRes, experiencesRes, educationRes, jobsRes]) {
      if (result.error) throw new Error(result.error.message);
    }

    const profile = profileRes.data ?? {};
    const candidate: MatchingCandidate = {
      headline: profile.headline,
      summary: profile.summary,
      location: profile.location,
      targetRoles: Array.isArray(profile.targetRoles) ? profile.targetRoles : [],
      targetCities: Array.isArray(profile.targetCities) ? profile.targetCities : [],
      contractPreferences: Array.isArray(profile.contractPreferences) ? profile.contractPreferences : [],
      remotePreference: profile.remotePreference,
      preferredSectors: Array.isArray(profile.preferredSectors) ? profile.preferredSectors : [],
      skills: skillsRes.data ?? [],
      experiences: experiencesRes.data ?? [],
      education: educationRes.data ?? [],
    };

    const opportunities = (jobsRes.data ?? []).map((job: any) => {
      const result = scoreJobMatch(candidate, {
        title: job.title,
        description: job.description,
        location: job.location,
        contractType: job.contractType,
        remoteMode: job.remoteMode,
        minExperienceYears: job.minExperienceYears,
        sector: job.aiSector,
        tags: [...(job.tags ?? []), ...(Array.isArray(job.aiSkills) ? job.aiSkills : [])],
        normalizedContent: job.normalizedContent,
      });
      return {
        ...job,
        opportunityScore: result.score,
        matchPercent: result.score,
        matchConfidence: result.confidence,
        matchCoverage: result.coverage,
        breakdown: Object.fromEntries(Object.entries(result.dimensions).map(([key, value]) => [key, value.score])),
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
        why: result.reasons,
        matchGaps: result.gaps,
        matchAlgorithm: result.algorithm,
      };
    }).sort((a: any, b: any) =>
      b.opportunityScore - a.opportunityScore || b.matchConfidence - a.matchConfidence
    );

    return NextResponse.json({
      count: opportunities.length,
      opportunities: opportunities.slice(0, 50),
      matching: { algorithm: "jobly-matching-v2", scoreMeaning: "adéquation pondérée des critères connus", confidenceMeaning: "fiabilité liée aux données réellement disponibles" },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Opportunités indisponibles." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const sb = adminClient();
    const writeLimit = await enforceApiRateLimit(req, sb, {
      scope: "opportunities-feedback",
      identity: `user:${auth.id}`,
      accountWindows: [{ limit: 30, windowSeconds: 60 }, { limit: 300, windowSeconds: 3600 }],
      ipWindows: [{ limit: 180, windowSeconds: 60 }, { limit: 1200, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (writeLimit) return writeLimit;

    const user = await ensureUser(sb, auth);
    const body = await req.json();
    if (!body.jobId || !["INTERESTED", "NOT_RELEVANT", "APPLIED"].includes(body.feedback)) {
      return NextResponse.json({ message: "Feedback invalide." }, { status: 400 });
    }
    const { error } = await sb.from("AuditLog").insert({
      userId: user.id,
      action: `OPPORTUNITY_FEEDBACK_${body.feedback}`,
      entityType: "Job",
      entityId: body.jobId,
      metadata: { source: body.source || "discovery" },
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Feedback impossible." },
      { status: 500 }
    );
  }
}

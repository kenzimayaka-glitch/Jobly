import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";
import { assessCareer, levelLabel } from "../../../../lib/careerEngine";

const norm = (v: unknown) => String(v || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function yearsFrom(experiences: any[]) {
  const starts = experiences.map((x) => new Date(String(x.startDate || "")).getTime()).filter(Number.isFinite);
  return starts.length ? Math.max(0, Math.floor((Date.now() - Math.min(...starts)) / (365.25 * 86400000))) : 0;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req); if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const sb = adminClient(); const recruiter = await ensureUser(sb, auth);
    const { data: roleUser } = await sb.from("User").select("role").eq("id", recruiter.id).maybeSingle();
    if (roleUser?.role !== "RECRUITER" && roleUser?.role !== "ADMIN") return NextResponse.json({ message: "Espace recruteur requis." }, { status: 403 });

    const [profilesRes, jobsRes] = await Promise.all([
      sb.from("Profile").select("userId,firstName,lastName,headline,location,targetRoles,targetCities,preferredSectors,publicDiscoverable").eq("publicDiscoverable", true).limit(200),
      sb.from("RecruiterJob").select("id,title,description,location,mode,contract,tags,minExperienceYears,status").eq("recruiterUserId", recruiter.id).eq("status", "published").limit(50),
    ]);
    if (profilesRes.error) throw new Error(profilesRes.error.message);
    if (jobsRes.error) throw new Error(jobsRes.error.message);
    const profiles = profilesRes.data || [];
    const userIds = profiles.map((p: any) => p.userId).filter(Boolean);
    if (!userIds.length) return NextResponse.json({ count: 0, talents: [], message: "Aucun talent public pour le moment." });

    const [exRes, skillRes, eduRes] = await Promise.all([
      sb.from("Experience").select("userId,title,company,startDate,endDate,description,provenance").in("userId", userIds),
      sb.from("Skill").select("userId,name,level,provenance").in("userId", userIds),
      sb.from("Education").select("userId,degree,field,institution,provenance").in("userId", userIds),
    ]);
    for (const r of [exRes, skillRes, eduRes]) if (r.error) throw new Error(r.error.message);

    const by = (rows: any[]) => rows.reduce((m, row) => { (m[row.userId] ||= []).push(row); return m; }, {} as Record<string, any[]>);
    const exBy = by(exRes.data || []), skillsBy = by(skillRes.data || []), eduBy = by(eduRes.data || []);
    const jobs = jobsRes.data || [];

    const talents = profiles.map((profile: any) => {
      const experiences = exBy[profile.userId] || [];
      const skills = skillsBy[profile.userId] || [];
      const education = eduBy[profile.userId] || [];
      const career = assessCareer({ experiences, skills, education, targetRole: profile.targetRoles?.[0] || null });
      const years = yearsFrom(experiences);
      let bestScore = Math.min(100, Math.round(career.readiness * 0.55 + Math.min(100, skills.length * 10) * 0.2 + Math.min(100, years * 10) * 0.25));
      let bestJob: any = null;
      let reasons: string[] = [];
      for (const job of jobs) {
        const title = norm(job.title); const roles = (profile.targetRoles || []).map(norm);
        const role = roles.some((r: string) => r && (title.includes(r) || r.includes(title))) ? 1 : 0;
        const city = profile.targetCities?.map(norm).includes(norm(job.location)) ? 1 : 0;
        const experience = years >= Number(job.minExperienceYears || 0) ? 1 : 0;
        const tags = Array.isArray(job.tags) ? job.tags.map(norm) : [];
        const skillHits = skills.filter((s: any) => tags.some((t: string) => t.includes(norm(s.name)) || norm(s.name).includes(t))).length;
        const skill = tags.length ? Math.min(1, skillHits / Math.max(1, Math.min(tags.length, 4))) : 0.5;
        const score = Math.round((role * 0.35 + city * 0.15 + experience * 0.2 + skill * 0.3) * 100);
        if (score > bestScore) { bestScore = score; bestJob = job; reasons = [role ? "Métier cible" : "", city ? "Zone cible" : "", experience ? "Expérience" : "", skill > 0.5 ? "Compétences" : ""].filter(Boolean); }
      }
      return {
        userId: profile.userId,
        name: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Talent Jobly",
        headline: profile.headline || levelLabel(career.currentLevel),
        location: profile.location || null,
        targetRoles: profile.targetRoles || [],
        yearsExperience: years,
        currentLevel: career.currentLevel,
        currentLevelLabel: levelLabel(career.currentLevel),
        readiness: career.readiness,
        topSkills: skills.slice(0, 8).map((s: any) => ({ name: s.name, level: s.level })),
        educationCount: education.length,
        quantifiedEvidence: career.dimensions.impact.evidence,
        discoveryScore: bestScore,
        bestJob: bestJob ? { id: bestJob.id, title: bestJob.title } : null,
        reasons: reasons.length ? reasons : ["Profil complet", `${career.readiness}% de readiness carrière`],
      };
    }).sort((a: any, b: any) => b.discoveryScore - a.discoveryScore).slice(0, 10);

    return NextResponse.json({ count: talents.length, talents, publicOnly: true, generatedAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Impossible de charger les talents publics." }, { status: 500 });
  }
}

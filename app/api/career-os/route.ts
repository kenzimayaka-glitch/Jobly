import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../lib/server-auth";
import { assessCareer, levelLabel } from "../../../lib/careerEngine";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req); if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const sb = adminClient(); const user = await ensureUser(sb, auth);
    const [p, e, s, ed, j] = await Promise.all([
      sb.from("Profile").select("headline,summary,location,targetRoles,targetCities,contractPreferences,remotePreference,preferredSectors,publicDiscoverable").eq("userId", user.id).maybeSingle(),
      sb.from("Experience").select("title,company,startDate,endDate,description,provenance").eq("userId", user.id),
      sb.from("Skill").select("name,level,provenance").eq("userId", user.id),
      sb.from("Education").select("degree,field,institution,startDate,endDate,provenance").eq("userId", user.id),
      sb.from("Job").select("id,title,location,contractType,remoteMode,minExperienceYears,isActive").eq("isActive", true).limit(1000),
    ]);
    for (const r of [p, e, s, ed, j]) if (r.error) throw new Error(r.error.message);

    const profile: any = p.data || {};
    const experiences = e.data || [];
    const skills = s.data || [];
    const education = ed.data || [];
    const assessment = assessCareer({ experiences, skills, education, targetRole: profile.targetRoles?.[0] || null });

    await sb.from("CareerAssessment").upsert({
      userId: user.id,
      currentLevel: assessment.currentLevel,
      targetLevel: assessment.targetLevel,
      readiness: assessment.readiness,
      dimensions: assessment.dimensions,
      criteria: assessment.criteria,
      gaps: assessment.gaps,
      nextBestAction: assessment.nextBestAction,
      computedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { onConflict: "userId" });

    const goals = (profile.targetRoles || []).map((x: string) => x.trim()).filter(Boolean);
    const targetCity = (profile.targetCities || [])[0] || profile.location || "";
    const gaps = [...assessment.gaps];
    if (!goals.length) gaps.unshift("Définir au moins un métier cible");
    if (!targetCity) gaps.push("Définir une ville cible");
    const nextAction = goals.length ? assessment.nextBestAction : "Définir un métier cible";
    const jobs = j.data || [];
    const roadmap = [
      { step: 1, title: "Établir le niveau actuel", done: true, action: `Niveau ${assessment.currentLevel} — ${levelLabel(assessment.currentLevel)}` },
      { step: 2, title: "Construire les preuves", done: assessment.dimensions.impact.score >= 60, action: "Documenter CA, croissance, objectifs, portefeuille, volumes et autres résultats" },
      { step: 3, title: "Combler les critères du niveau suivant", done: assessment.readiness >= 80, action: assessment.nextBestAction },
      { step: 4, title: "Tester le marché", done: jobs.length > 0, action: "Comparer les opportunités au niveau réellement atteignable" },
    ];

    return NextResponse.json({
      goals,
      targetCity,
      yearsExperience: assessment.yearsExperience,
      currentLevel: assessment.currentLevel,
      currentLevelLabel: levelLabel(assessment.currentLevel),
      targetLevel: assessment.targetLevel,
      targetLevelLabel: levelLabel(assessment.targetLevel),
      readiness: assessment.readiness,
      dimensions: assessment.dimensions,
      criteria: assessment.criteria,
      gap: gaps.slice(0, 6),
      nextBestAction: nextAction,
      roadmap,
      publicDiscoverable: Boolean(profile.publicDiscoverable),
      profileCompleteness: { skills: skills.length, experiences: experiences.length, education: education.length },
    });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Career OS indisponible." }, { status: 500 });
  }
}

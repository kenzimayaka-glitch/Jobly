import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
import { buildJiaContext } from "@/lib/jiaContext";
import { buildCareerOsSnapshot } from "@/lib/careerOs";
import { localizeCareerList, localizeCareerText, type CareerLang } from "@/lib/careerText";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const lang: CareerLang = new URL(req.url).searchParams.get("lang") === "en" ? "en" : "fr";
    const L = (x: string) => localizeCareerText(x, lang);
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const result = await buildJiaContext(sb, user.id, {
      operation: "CAREER_BRAIN",
      input: { source: "api/career-os" },
    });

    if (result.error || !result.context?.careerBrain) {
      return NextResponse.json({ ok: true, available: false, message: result.error || "Career OS indisponible." });
    }

    const profile = result.context.profile || {};
    const goals = Array.isArray(profile.targetRoles) ? profile.targetRoles.map((x: unknown) => String(x).trim()).filter(Boolean) : [];
    const targetCity = Array.isArray(profile.targetCities) && profile.targetCities[0]
      ? String(profile.targetCities[0])
      : String(profile.location || "");

    const { data: jobs, error: jobsError } = await sb
      .from("Job")
      .select("id,title,location,contractType,remoteMode,minExperienceYears,isActive")
      .eq("isActive", true)
      .order("lastSeenAt", { ascending: false })
      .limit(100);

    if (jobsError) {
      return NextResponse.json({ ok: false, available: false, message: jobsError.message }, { status: 503 });
    }

    const snapshot = buildCareerOsSnapshot(result.context.careerBrain, {
      jobs: (jobs ?? []) as Array<Record<string, unknown>>,
    });

    return NextResponse.json({
      ok: true,
      available: true,
      architecture: "Career Journey 360 — Architecture B",
      sourceOfTruth: "CareerJourney",
      goals,
      targetCity,
      currentLevel: snapshot.careerTwin.currentLevel,
      targetLevel: snapshot.careerTwin.targetLevel,
      currentLevelLabel: snapshot.careerTwin.currentLevel == null ? null : L("Niveau " + snapshot.careerTwin.currentLevel),
      targetLevelLabel: snapshot.careerTwin.targetLevel == null ? null : L("Niveau " + snapshot.careerTwin.targetLevel),
      readiness: snapshot.readiness.score,
      readinessBand: snapshot.readiness.band,
      dimensions: {},
      criteria: localizeCareerList(snapshot.gps.gaps, lang),
      gap: localizeCareerList(snapshot.gps.gaps, lang),
      nextBestAction: snapshot.companion.nextBestAction ? L(snapshot.companion.nextBestAction) : null,
      roadmap: snapshot.gps.route.map((item) => ({ ...item, label: L(item.label) })),
      publicDiscoverable: Boolean(profile.publicDiscoverable),
      profileCompleteness: {
        skills: result.context.skills.length,
        experiences: result.context.experiences.length,
        education: result.context.education.length,
      },
      careerOs: snapshot,
      policy: {
        mode: "computed-read",
        createsParallelState: false,
        autonomousExternalAction: false,
        userDecisionRequiredForActions: true,
      },
    });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : "Career OS indisponible." }, { status: 500 });
  }
}

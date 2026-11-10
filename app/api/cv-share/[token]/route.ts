import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/server-auth";
import { isProfilePhotoPublic } from "@/lib/profilePhotoStorage";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const supabase = adminClient();
    const { data: share, error } = await supabase.from("CVShare").select("*").eq("token", token).maybeSingle();
    if (error || !share || share.revokedAt || (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now())) return NextResponse.json({ message: "Ce partage CV n'est plus disponible." }, { status: 404 });

    // WhatsApp application shares expose only the exact approved application document.
    // Do not fetch or serialize the candidate's full profile behind a UI-hidden card.
    const applicationMatch = typeof share.source === "string" ? share.source.match(/^WHATSAPP_APPLICATION:([0-9a-f-]{36})$/i) : null;
    if (applicationMatch) {
      const [applicationResult, userResult] = await Promise.all([
        supabase.from("Application").select("id,userId,jobId,recruiterJobId,tailoredCvText,letterText")
          .eq("id", applicationMatch[1]).eq("userId", share.userId).maybeSingle(),
        supabase.from("User").select("displayName,firstName,lastName").eq("id", share.userId).maybeSingle(),
      ]);
      if (applicationResult.error) throw new Error(applicationResult.error.message);
      if (userResult.error) throw new Error(userResult.error.message);
      const application = applicationResult.data;
      const user = userResult.data;
      const linkageValid = Boolean(application && (
        (application.jobId && share.jobId === application.jobId) ||
        (application.recruiterJobId && !share.jobId)
      ));
      if (!application || !linkageValid || !String(application.tailoredCvText || "").trim() || !user) {
        return NextResponse.json({ message: "Le document lié à ce partage n'est plus disponible." }, { status: 404 });
      }
      const offerTable = application.jobId ? "Job" : "RecruiterJob";
      const offerId = application.jobId || application.recruiterJobId;
      const { data: offer, error: offerError } = await supabase.from(offerTable).select("description").eq("id", offerId).maybeSingle();
      if (offerError) throw new Error(offerError.message);
      if (!offer) return NextResponse.json({ message: "L'offre liée à ce partage n'est plus disponible." }, { status: 404 });
      const description = String(offer.description || "");
      const coverLetterRequired = /(?:lettre\s+(?:de\s+)?motivation[^.\n]{0,120}(?:obligatoire|requise|exigée|demandée|à\s+joindre|à\s+fournir)|(?:obligatoire|requise|exigée|demandée)[^.\n]{0,80}lettre\s+(?:de\s+)?motivation|cover\s+letter\s+(?:is\s+)?(?:required|mandatory))/i.test(description);
      await supabase.from("CVShare").update({ viewCount: (share.viewCount || 0) + 1 }).eq("id", share.id);
      return NextResponse.json({
        share: { token, jobTitle: share.jobTitleSnapshot, companyName: share.companyNameSnapshot },
        application: {
          cvText: String(application.tailoredCvText || ""),
          letterText: coverLetterRequired ? String(application.letterText || "") : "",
          coverLetterRequired,
        },
        user: {
          displayName: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        profile: null,
        experiences: [],
        skills: [],
        education: [],
      }, { headers: { "Cache-Control": "no-store, private" } });
    }

    const [userRes, profileRes, expRes, skillRes, eduRes] = await Promise.all([
      supabase.from("User").select("id,displayName,firstName,lastName,profilePhotoUrl,profilePhotoVisibility,profilePhotoConsentAt,englishLevel,licences").eq("id", share.userId).single(),
      supabase.from("Profile").select("*").eq("userId", share.userId).maybeSingle(),
      supabase.from("Experience").select("*").eq("userId", share.userId).order("startDate", { ascending: false }),
      supabase.from("Skill").select("*").eq("userId", share.userId).order("name"),
      supabase.from("Education").select("*").eq("userId", share.userId).order("startDate", { ascending: false }),
    ]);
    for (const r of [userRes, profileRes, expRes, skillRes, eduRes]) if (r.error) throw new Error(r.error.message);
    if (!userRes.data) {
      return NextResponse.json({ message: "Ce partage CV n'est plus disponible." }, { status: 404 });
    }
    const applicationPayload: { cvText: string; letterText: string; coverLetterRequired: boolean } | null = null;

    await supabase.from("CVShare").update({ viewCount: (share.viewCount || 0) + 1 }).eq("id", share.id);

    return NextResponse.json({
      share: { token, jobTitle: share.jobTitleSnapshot, companyName: share.companyNameSnapshot },
      application: applicationPayload,
      user: {
        id: userRes.data.id,
        displayName: userRes.data.displayName,
        firstName: userRes.data.firstName,
        lastName: userRes.data.lastName,
        profilePhotoUrl: isProfilePhotoPublic(userRes.data) ? userRes.data.profilePhotoUrl : null,
        englishLevel: userRes.data.englishLevel,
        licences: userRes.data.licences,
      }, profile: profileRes.data ? { firstName: profileRes.data.firstName, lastName: profileRes.data.lastName, headline: profileRes.data.headline, summary: profileRes.data.summary, location: profileRes.data.location, targetRoles: profileRes.data.targetRoles, preferredSectors: profileRes.data.preferredSectors, targetCities: profileRes.data.targetCities, contractPreferences: profileRes.data.contractPreferences, remotePreference: profileRes.data.remotePreference } : null,
      experiences: expRes.data || [], skills: skillRes.data || [], education: eduRes.data || [],
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de charger le CV." }, { status: 500 });
  }
}

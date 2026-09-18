import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const supabase = adminClient();
    const { data: share, error } = await supabase.from("CVShare").select("*").eq("token", token).maybeSingle();
    if (error || !share || share.revokedAt || (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now())) return NextResponse.json({ message: "Ce partage CV n'est plus disponible." }, { status: 404 });

    const [userRes, profileRes, expRes, skillRes, eduRes] = await Promise.all([
      supabase.from("User").select("id,displayName,firstName,lastName,profilePhotoUrl,email,phone,englishLevel,licences").eq("id", share.userId).single(),
      supabase.from("Profile").select("*").eq("userId", share.userId).maybeSingle(),
      supabase.from("Experience").select("*").eq("userId", share.userId).order("startDate", { ascending: false }),
      supabase.from("Skill").select("*").eq("userId", share.userId).order("name"),
      supabase.from("Education").select("*").eq("userId", share.userId).order("startDate", { ascending: false }),
    ]);
    for (const r of [userRes, profileRes, expRes, skillRes, eduRes]) if (r.error) throw new Error(r.error.message);
    await supabase.from("CVShare").update({ viewCount: (share.viewCount || 0) + 1 }).eq("id", share.id);

    return NextResponse.json({
      share: { token, jobTitle: share.jobTitleSnapshot, companyName: share.companyNameSnapshot },
      user: userRes.data, profile: profileRes.data,
      experiences: expRes.data || [], skills: skillRes.data || [], education: eduRes.data || [],
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Impossible de charger le CV." }, { status: 500 });
  }
}

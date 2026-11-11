import { getActivePlanCode } from "@/lib/entitlements";

export type TalentShowcasePlan = "FREE" | "PRO" | "PREMIUM";

export async function getTalentShowcasePlan(supabase: any, userId: string): Promise<TalentShowcasePlan> {
  const code = await getActivePlanCode(supabase, userId, "TALENT");
  if (code === "PRO") return "PRO";
  if (code === "PREMIUM") return "PREMIUM";
  return "FREE";
}

export const TALENT_SHOWCASE_LIMITS = {
  PRO: { pitchSeconds: 20, images: 6, adSeconds: 12 },
  PREMIUM: { pitchSeconds: 10, images: 3, adSeconds: 8 },
} as const;

export type JiaEcosystem = "TALENT" | "RECRUITER" | "PARTNER" | "ADMIN";

type InternalUser = { id: string; role?: string | null };

/** Resolve module membership from server-side records. CEO Copilot is not exposed here. */
export async function getJiaAvailableEcosystems(
  db: any,
  user: InternalUser,
  authUserId: string,
): Promise<JiaEcosystem[]> {
  const role = String(user.role || "TALENT").toUpperCase();
  if (role === "ADMIN") return ["ADMIN"];

  const [talent, recruiterProfile, recruiterJobs, partner, mobilityProvider, extendedPartner] = await Promise.all([
    db.from("Profile").select("id").eq("userId", user.id).maybeSingle(),
    db.from("RecruiterProfile").select("id").eq("userId", authUserId).maybeSingle(),
    db.from("RecruiterJob").select("id").eq("recruiterUserId", user.id).limit(1).maybeSingle(),
    db.from("Partner").select("id").eq("userId", user.id).maybeSingle(),
    db.from("MobilityServiceProvider").select("id").eq("userId", user.id).maybeSingle(),
    db.from("PartnerExtended").select("id").eq("partnerUserId", user.id).limit(1).maybeSingle(),
  ]);
  for (const result of [talent, recruiterProfile, recruiterJobs, partner, mobilityProvider, extendedPartner]) {
    if (result.error) throw new Error(result.error.message);
  }

  const allowed: JiaEcosystem[] = [];
  if (role === "TALENT" || talent.data) allowed.push("TALENT");
  if (role === "RECRUITER" || recruiterProfile.data || recruiterJobs.data) allowed.push("RECRUITER");
  if (role === "PARTNER" || partner.data || mobilityProvider.data || extendedPartner.data) allowed.push("PARTNER");
  return allowed;
}

export function isJiaEcosystem(value: unknown): value is JiaEcosystem {
  return value === "TALENT" || value === "RECRUITER" || value === "PARTNER" || value === "ADMIN";
}

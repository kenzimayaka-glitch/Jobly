export type ApplicationReadinessInput = { email?: unknown; phone?: unknown; applicationUrl?: unknown; };
export type ApplicationReadiness = { applicationReady: boolean; applicationAvailability: "DIRECT" | "SOURCE_ONLY"; applicationUrl: string | null; };
/** A direct route is a usable email, phone, or safe HTTP(S) application form. */
export function resolveApplicationReadiness(input: ApplicationReadinessInput): ApplicationReadiness {
  const email = String(input.email ?? "").trim();
  const phone = String(input.phone ?? "").trim();
  let applicationUrl: string | null = null;
  const rawUrl = String(input.applicationUrl ?? "").trim();
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if ((parsed.protocol === "https:" || parsed.protocol === "http:") && !parsed.username && !parsed.password) applicationUrl = parsed.toString();
    } catch { applicationUrl = null; }
  }
  const applicationReady = Boolean(email || phone || applicationUrl);
  return { applicationReady, applicationAvailability: applicationReady ? "DIRECT" : "SOURCE_ONLY", applicationUrl };
}

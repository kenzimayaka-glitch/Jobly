import { NextRequest } from "next/server";
import { runAiGateway } from "./aiGateway";
import { newId } from "./server-auth";

export type ApplicationChannel = "JOBLY" | "EMAIL" | "EXTERNAL" | "UNSUPPORTED";

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolveApplicationChannel(profile: Record<string, unknown>): { channel: ApplicationChannel; recipient: string | null; link: string | null; reason: string } {
  const channel = String(profile.channel || profile.applicationChannel || "").toUpperCase();
  const email = stringValue(profile.applicationEmail || profile.email || profile.recipientEmail);
  const link = stringValue(profile.applicationUrl || profile.url || profile.applyUrl);
  if (channel === "JOBLY" || channel === "INTEGRATED") return { channel: "JOBLY", recipient: email, link, reason: "Candidature intégrée à Jobly." };
  if ((channel === "EMAIL" || channel === "MAIL") && email) return { channel: "EMAIL", recipient: email, link, reason: "L'offre indique une candidature par email." };
  if ((channel === "EXTERNAL" || channel === "PLATFORM" || channel === "LINK") && link) return { channel: "EXTERNAL", recipient: email, link, reason: "L'offre exige une plateforme externe." };
  if (email) return { channel: "EMAIL", recipient: email, link, reason: "Un email de candidature est explicitement indiqué." };
  if (link) return { channel: "EXTERNAL", recipient: null, link, reason: "Un lien de candidature est explicitement indiqué." };
  return { channel: "UNSUPPORTED", recipient: null, link: null, reason: "Aucun canal de candidature vérifiable n'est indiqué dans l'offre." };
}

export async function prepareApplication(req: NextRequest, args: {
  userId: string;
  applicationId: string;
  jobTitle: string;
  jobDescription: string;
  company: string;
  location: string | null;
  applicationProfile: Record<string, unknown>;
  profile: Record<string, unknown>;
  experiences: unknown[];
  skills: unknown[];
}) {
  const channel = resolveApplicationChannel(args.applicationProfile);
  if (channel.channel === "UNSUPPORTED") throw new Error(channel.reason);

  const ai = await runAiGateway(req, "APPLICATION_COPILOT", {
    jobTitle: args.jobTitle,
    jobDescription: args.jobDescription,
  });
  if (!ai.ok) throw new Error(ai.message);

  const output = (ai.output && typeof ai.output === "object") ? ai.output as Record<string, unknown> : { text: String(ai.output || "") };
  const letter = stringValue(output.coverLetter) || stringValue(output.letter) || null;
  const warnings = Array.isArray(output.warnings) ? output.warnings.filter((x): x is string => typeof x === "string") : [];

  return {
    id: newId(),
    channel,
    ai,
    letter,
    warnings,
    readyForSubmission: channel.channel === "JOBLY",
    requiresUserConnection: channel.channel === "EMAIL",
    requiresExternalUserAction: channel.channel === "EXTERNAL",
  };
}

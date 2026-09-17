import { NextRequest } from "next/server";
import { runAiGateway } from "./aiGateway";

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
  if ((channel === "EXTERNAL" || channel === "PLATFORM" || channel === "LINK") && link) return { channel: "EXTERNAL", recipient: null, link, reason: "L'offre exige une plateforme externe." };
  if (email) return { channel: "EMAIL", recipient: email, link, reason: "Un email de candidature est explicitement indiqué." };
  if (link) return { channel: "EXTERNAL", recipient: null, link, reason: "Un lien de candidature est explicitement indiqué." };
  return { channel: "UNSUPPORTED", recipient: null, link: null, reason: "Aucun canal de candidature vérifiable n'est indiqué dans l'offre." };
}

function buildGroundedLetter(profile: Record<string, unknown>, jobTitle: string, company: string) {
  const firstName = stringValue(profile.firstName) || "Madame, Monsieur";
  const headline = stringValue(profile.headline);
  const summary = stringValue(profile.summary);
  const role = headline ? `Mon parcours de ${headline}` : "Mon parcours professionnel";
  const evidence = summary ? ` ${summary}` : "";
  return `Objet : Candidature — ${jobTitle}\n\nMadame, Monsieur,\n\nJe souhaite vous soumettre ma candidature au poste de ${jobTitle} au sein de ${company}. ${role} m'amène à porter un intérêt particulier à cette opportunité.${evidence}\n\nJe serais heureux(se) de pouvoir échanger avec vous afin de présenter plus précisément mon parcours et les éléments de mon expérience qui correspondent aux besoins du poste.\n\nJe vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.\n\n${firstName}`;
}

export async function prepareApplication(req: NextRequest, args: {
  jobTitle: string;
  jobDescription: string;
  company: string;
  applicationProfile: Record<string, unknown>;
  profile: Record<string, unknown>;
}) {
  const channel = resolveApplicationChannel(args.applicationProfile);
  if (channel.channel === "UNSUPPORTED") throw new Error(channel.reason);
  const ai = await runAiGateway(req, "APPLICATION_COPILOT", { jobTitle: args.jobTitle, jobDescription: args.jobDescription });
  if (!ai.ok) throw new Error(ai.message);
  const output = ai.output && typeof ai.output === "object" ? ai.output as Record<string, unknown> : {};
  const warnings = Array.isArray(output.warnings) ? output.warnings.filter((x): x is string => typeof x === "string") : [];
  return {
    channel,
    ai,
    letter: buildGroundedLetter(args.profile, args.jobTitle, args.company),
    warnings,
    readyForSubmission: channel.channel === "JOBLY",
    requiresUserConnection: channel.channel === "EMAIL",
    requiresExternalUserAction: channel.channel === "EXTERNAL",
  };
}

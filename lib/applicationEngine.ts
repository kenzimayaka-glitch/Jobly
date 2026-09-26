import { NextRequest } from "next/server";
import { runAiGateway } from "./aiGateway";
import { getChannelDefinition, hasJoblyAdapter } from "./applicationChannels";
import { buildTailoredCv, TailoredCvEducation, TailoredCvExperience, TailoredCvProfile, TailoredCvSkill } from "./applicationCv";

export type ApplicationChannel = "JOBLY" | "EMAIL" | "EXTERNAL" | "UNSUPPORTED";

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractApplicationEmail(text: string): string | null {
  const matches = Array.from(new Set(
    (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi) || [])
      .map(value => value.trim().replace(/[),.;:]+$/, ""))
  ));
  if (!matches.length) return null;
  const lower = text.toLowerCase();
  let best: { email: string; score: number } | null = null;
  for (const email of matches) {
    const index = lower.indexOf(email.toLowerCase());
    const context = lower.slice(Math.max(0, index - 180), Math.min(lower.length, index + email.length + 180));
    let score = 0;
    if (/(candidature|candidater|postuler|recrutement|recrute|recruitment|cv|curriculum|envoyer|envoyez|adresse de candidature|modalites de candidature|apply)/i.test(context)) score += 5;
    if (/(email|mail|e-mail)/i.test(context)) score += 1;
    if (/^(aide|info|contact|support)@/i.test(email)) score -= 2;
    if (score > 0 && (!best || score > best.score)) best = { email, score };
  }
  return best?.email || null;
}

export function resolveApplicationChannel(profile: Record<string, unknown>): { channel: ApplicationChannel; recipient: string | null; link: string | null; adapterKey: string | null; reason: string } {
  const requested = String(profile.channel || profile.applicationChannel || "").toUpperCase();
  const email = stringValue(profile.applicationEmail || profile.email || profile.recipientEmail);
  const link = stringValue(profile.applicationUrl || profile.url || profile.applyUrl);
  const adapterKey = stringValue(profile.adapterKey || profile.integrationKey);

  if (requested === "JOBLY" || requested === "INTEGRATED") {
    if (hasJoblyAdapter(adapterKey)) return { channel: "JOBLY", recipient: email, link, adapterKey, reason: "Adaptateur Jobly vérifié disponible." };
    return { channel: "UNSUPPORTED", recipient: null, link: null, adapterKey, reason: "L'offre indique une intégration Jobly, mais aucun adaptateur de soumission vérifié n'est enregistré." };
  }
  if ((requested === "EMAIL" || requested === "MAIL") && email) return { channel: "EMAIL", recipient: email, link, adapterKey: null, reason: "L'offre indique une candidature par email." };
  if ((requested === "EXTERNAL" || requested === "PLATFORM" || requested === "LINK") && link) return { channel: "EXTERNAL", recipient: null, link, adapterKey: null, reason: "L'offre exige une plateforme externe non automatisée par Jobly." };
  if (email) return { channel: "EMAIL", recipient: email, link, adapterKey: null, reason: "Un email de candidature est explicitement indiqué." };
  if (link) return { channel: "EXTERNAL", recipient: null, link, adapterKey: null, reason: "Un lien de candidature est explicitement indiqué, sans adaptateur Jobly vérifié." };
  return { channel: "UNSUPPORTED", recipient: null, link: null, adapterKey: null, reason: "Aucun canal de candidature vérifiable n'est indiqué dans l'offre." };
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
  profile: TailoredCvProfile;
  experiences: TailoredCvExperience[];
  skills: TailoredCvSkill[];
  education: TailoredCvEducation[];
  letterOverride?: string | null;
  skipAi?: boolean;
}) {
  const applicationProfile = { ...args.applicationProfile };\n  if (!stringValue(applicationProfile.applicationEmail) && !stringValue(applicationProfile.email) && !stringValue(applicationProfile.recipientEmail) && String(applicationProfile.channel || applicationProfile.applicationChannel || "").toUpperCase() === "EMAIL") {\n    const extractedEmail = extractApplicationEmail(args.jobDescription);\n    if (extractedEmail) applicationProfile.applicationEmail = extractedEmail;\n  }\n  const channel = resolveApplicationChannel(applicationProfile);
  if (channel.channel === "UNSUPPORTED") throw new Error(channel.reason);
  const definition = getChannelDefinition(channel.channel);
  const ai = args.skipAi ? { ok: true as const, output: {}, message: "" } : await runAiGateway(req, "APPLICATION_COPILOT", { jobTitle: args.jobTitle, jobDescription: args.jobDescription });
  if (!ai.ok) throw new Error(ai.message);
  const output = ai.output && typeof ai.output === "object" ? ai.output as Record<string, unknown> : {};
  const warnings = Array.isArray(output.warnings) ? output.warnings.filter((x): x is string => typeof x === "string") : [];
  const tailoredCvText = buildTailoredCv({
    profile: args.profile,
    experiences: args.experiences,
    skills: args.skills,
    education: args.education,
    jobTitle: args.jobTitle,
    jobDescription: args.jobDescription,
  });
  return {
    channel,
    definition,
    ai,
    letter: stringValue(args.letterOverride) || buildGroundedLetter(args.profile, args.jobTitle, args.company),
    tailoredCvText,
    warnings,
    readyForSubmission: definition.automated && !definition.requiresConnection,
    requiresUserConnection: definition.requiresConnection,
    requiresExternalUserAction: channel.channel === "EXTERNAL",
  };
}

import { NextRequest } from "next/server";
import { runAiGateway } from "./aiGateway";
import { getChannelDefinition, hasJoblyAdapter } from "./applicationChannels";
import { buildTailoredCv, TailoredCvEducation, TailoredCvExperience, TailoredCvProfile, TailoredCvSkill } from "./applicationCv";
import { extractApplicationEmail, extractApplicationSubject } from "./applicationSubject";
import { normalizeJobContent } from "./jobNormalizer";

export type ApplicationChannel = "JOBLY" | "EMAIL" | "PHONE" | "EXTERNAL" | "UNSUPPORTED";

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function extractApplicationPhone(text: string): string | null {
  const matches = Array.from(new Set(
    (text.match(/(?:\+?237[\s.-]?(?:\+?237[\s.-]?)?[26]\d{8}|[26]\d{8})/g) || [])
      .map(value => value.replace(/[^\d+]/g, "").replace(/^\+237\+237/, "+237"))
  ));
  if (!matches.length) return null;
  const lower = text.toLowerCase();
  let best: { phone: string; score: number } | null = null;
  for (const phone of matches) {
    const digits = phone.replace(/[^\d]/g, "").slice(-9);
    const index = lower.indexOf(digits);
    const context = lower.slice(Math.max(0, index - 220), Math.min(lower.length, index + phone.length + 220));
    let score = 0;
    if (/(candidature|candidater|postuler|recrutement|recrute|whatsapp|téléphone|telephone|tel|appeler|appel|joindre|contacter|envoyer|envoyez|modalites de candidature|apply)/i.test(context)) score += 5;
    if (/(whatsapp|téléphone|telephone|tel|contact)/i.test(context)) score += 1;
    if (score > 0 && (!best || score > best.score)) best = { phone, score };
  }
  return best?.phone || null;
}

export function resolveApplicationContact(applicationProfile: Record<string, unknown>, jobDescription: string): { email: string | null; phone: string | null } {
  const explicitEmail = stringValue(applicationProfile.applicationEmail || applicationProfile.email || applicationProfile.recipientEmail);
  const phoneValues = [
    applicationProfile.applicationPhone,
    applicationProfile.phone,
    applicationProfile.recipientPhone,
    applicationProfile.whatsappPhone,
    applicationProfile.phoneNumber,
    ...(Array.isArray(applicationProfile.phoneNumbers) ? applicationProfile.phoneNumbers : []),
  ];
  const explicitPhone = phoneValues.map(value => stringValue(value)).find(Boolean) || null;
  return {
    email: explicitEmail || extractApplicationEmail(jobDescription),
    phone: explicitPhone || extractApplicationPhone(jobDescription),
  };
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
  const phone = stringValue(profile.applicationPhone || profile.phone || profile.recipientPhone || profile.whatsappPhone || profile.phoneNumber);
  if ((requested === "PHONE" || requested === "WHATSAPP" || requested === "WHATSAPP_PHONE" || requested === "TEL" || requested === "TELEPHONE") && phone) return { channel: "PHONE", recipient: phone, link, adapterKey: null, reason: "L'offre indique une candidature par téléphone ou WhatsApp." };
  if ((requested === "EXTERNAL" || requested === "PLATFORM" || requested === "LINK") && link) return { channel: "EXTERNAL", recipient: null, link, adapterKey: null, reason: "L'offre exige une plateforme externe non automatisée par Jobly." };
  if (email) return { channel: "EMAIL", recipient: email, link, adapterKey: null, reason: "Un email de candidature est explicitement indiqué." };
  if (phone) return { channel: "PHONE", recipient: phone, link, adapterKey: null, reason: "Un numéro de candidature vérifié est indiqué." };
  if (link) return { channel: "EXTERNAL", recipient: null, link, adapterKey: null, reason: "Un lien de candidature est explicitement indiqué, sans adaptateur Jobly vérifié." };
  return { channel: "UNSUPPORTED", recipient: null, link: null, adapterKey: null, reason: "Aucun canal de candidature vérifiable n'est indiqué dans l'offre." };
}

function buildGroundedLetter(profile: Record<string, unknown>, jobTitle: string, company: string) {
  const firstName = stringValue(profile.firstName) || "Madame, Monsieur";
  const headline = stringValue(profile.headline);
  const summary = stringValue(profile.summary);
  const role = headline ? `Mon parcours de ${headline}` : "Mon parcours professionnel";
  const evidence = summary ? ` ${summary}` : "";
  return `Objet : Candidature — ${jobTitle}

Madame, Monsieur,

Je souhaite vous soumettre ma candidature au poste de ${jobTitle} au sein de ${company}. ${role} m'amène à porter un intérêt particulier à cette opportunité.${evidence}

Je serais heureux(se) de pouvoir échanger avec vous afin de présenter plus précisément mon parcours et les éléments de mon expérience qui correspondent aux besoins du poste.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${firstName}`;
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
  const applicationProfile = { ...args.applicationProfile };
  // The candidature channel and subject are derived from the dedicated
  // application section, never from the whole offer body.
  const applicationText = normalizeJobContent({
    title: args.jobTitle,
    description: args.jobDescription,
  }).application.join("\n");
  const contacts = resolveApplicationContact(applicationProfile, applicationText);
  if (!stringValue(applicationProfile.applicationEmail) && contacts.email) applicationProfile.applicationEmail = contacts.email;
  if (!stringValue(applicationProfile.applicationPhone) && contacts.phone) applicationProfile.applicationPhone = contacts.phone;
  const channel = resolveApplicationChannel(applicationProfile);
  const subject = extractApplicationSubject(applicationText);
  if (channel.channel === "UNSUPPORTED") throw new Error(channel.reason);
  const definition = getChannelDefinition(channel.channel);
  // Email candidature uses the review flow without consuming J’IA AI credits.
  const skipAi = Boolean(args.skipAi || channel.channel === "EMAIL");
  const ai = skipAi ? { ok: true as const, output: {}, message: "" } : await runAiGateway(req, "APPLICATION_COPILOT", { jobTitle: args.jobTitle, jobDescription: args.jobDescription });
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
    subject,
    applicationContact: contacts,
    ai,
    letter: stringValue(args.letterOverride) || buildGroundedLetter(args.profile, args.jobTitle, args.company),
    tailoredCvText,
    warnings,
    readyForSubmission: definition.automated && !definition.requiresConnection,
    requiresUserConnection: definition.requiresConnection,
    requiresExternalUserAction: channel.channel === "EXTERNAL",
  };
}

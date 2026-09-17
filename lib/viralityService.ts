import { jobPublicUrl, JOBLY_PUBLIC_HOST } from "./site";

export type JobForVirality = {
  id: string;
  title: string;
  companyName?: string | null;
  description?: string | null;
  location?: string | null;
  contract?: string | null;
};

export function getEmailTemplate(
  type: "accept" | "reject" | "relaunch",
  candidateName: string,
  companyName: string
) {
  const templates = {
    accept: {
      subject: `Bonne nouvelle — votre candidature chez ${companyName}`,
      body: `Bonjour ${candidateName},\n\nVotre candidature a retenu notre attention. Nous souhaitons poursuivre le processus avec vous.\n\nCordialement,\n${companyName}\n\nRecrutement géré via Jobly - Trouvez votre job sur ${JOBLY_PUBLIC_HOST}`,
    },
    reject: {
      subject: `Suite à votre candidature chez ${companyName}`,
      body: `Bonjour ${candidateName},\n\nMerci pour votre candidature. Après examen, nous ne pouvons malheureusement pas donner suite à celle-ci pour le moment.\n\nNous vous souhaitons une excellente continuation.\n\n${companyName}\n\nRecrutement géré via Jobly - Trouvez votre job sur ${JOBLY_PUBLIC_HOST}`,
    },
    relaunch: {
      subject: `Relance de votre candidature chez ${companyName}`,
      body: `Bonjour ${candidateName},\n\nNous revenons vers vous concernant votre candidature. N'hésitez pas à nous répondre si vous souhaitez poursuivre l'échange.\n\n${companyName}\n\nRecrutement géré via Jobly - Trouvez votre job sur ${JOBLY_PUBLIC_HOST}`,
    },
  };
  const selected = templates[type];
  return { subject: selected.subject, bodyWithPub: selected.body };
}

export function generateSharePack(job: JobForVirality) {
  const url = jobPublicUrl(job.id, "recruiter");
  const company = job.companyName || "Entreprise";
  const base = `🚀 ${job.title} chez ${company}${job.location ? ` — ${job.location}` : ""}\n\nPostule directement sur Jobly : ${url}\n\n#Jobly #Emploi #Recrutement`;
  return {
    linkedinText: `💼 Opportunité à saisir\n\n${base}\n\nPartage à ton réseau pour aider la bonne personne à trouver cette opportunité.`,
    facebookText: `📣 Nouvelle opportunité !\n\n${base}`,
    whatsappText: `🔥 OFFRE D'EMPLOI\n${job.title}\n${company}${job.location ? ` • ${job.location}` : ""}\n\n👉 Postuler : ${url}`,
    imagePrompt: `Affiche emploi Jobly carrée 1080x1080, titre "${job.title}", entreprise "${company}", style premium blanc, jaune #FFC72C, bleu #2E5C9E, navy #0A1931, QR code vers ${url}.`,
  };
}

export function generateViralPoster(job: JobForVirality): string {
  return `jobly-poster://${encodeURIComponent(job.id)}?title=${encodeURIComponent(job.title)}`;
}

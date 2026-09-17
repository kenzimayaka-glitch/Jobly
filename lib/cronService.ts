import { getEmailTemplate } from "./viralityService";
import { sendEmailFromRecruiter } from "./gmailService";

export type RelaunchCandidate = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  companyName: string;
  interviewAt: string;
};

export async function checkForRelaunch(candidates: RelaunchCandidate[], recruiterEmail: string) {
  const threshold = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const eligible = candidates.filter((candidate) => new Date(candidate.interviewAt).getTime() <= threshold);
  const sent = [];
  for (const candidate of eligible) {
    const template = getEmailTemplate("relaunch", candidate.candidateName, candidate.companyName);
    const result = await sendEmailFromRecruiter({
      to: candidate.candidateEmail,
      subject: template.subject,
      body: template.bodyWithPub,
    });
    sent.push({ candidateId: candidate.id, ...result });
  }
  return { checked: candidates.length, eligible: eligible.length, sent };
}

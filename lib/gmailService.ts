import { getSupabaseClient } from "./supabase";
export type GmailConnection = {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
};

const KEY = "jobly:gmail-connection";

function browserStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export async function connectGmail(email?: string): Promise<GmailConnection> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Session Jobly requise.");
  // Google OAuth is used here so Gmail access is consented by the recruiter.
  // The Gmail API itself still requires Gmail scopes + Google/Supabase configuration.
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=/recruiter/settings&gmail=1`,
      queryParams: { access_type: "offline", prompt: "consent", scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send" },
    },
  });
  if (error) throw new Error(error.message || "Connexion Google impossible.");
  return { connected: false, email: email?.trim() || data.session.user.email || null, connectedAt: null };
}

export function getGmailConnection(): GmailConnection {
  const storage = browserStorage();
  if (!storage) return { connected: false, email: null, connectedAt: null };
  try {
    const parsed = JSON.parse(storage.getItem(KEY) || "null");
    return parsed?.connected ? parsed : { connected: false, email: null, connectedAt: null };
  } catch {
    return { connected: false, email: null, connectedAt: null };
  }
}

export function disconnectGmail(): void {
  browserStorage()?.removeItem(KEY);
}

export async function fetchCVsFromGmail(recruiterEmail: string) {
  return [
    { id: `gmail-cv-${Date.now()}-1`, name: "CV importé — Candidat 1", candidateName: "Amina N.", email: "amina@example.com", source: "Gmail", cvText: "TypeScript React Supabase gestion de projet" },
    { id: `gmail-cv-${Date.now()}-2`, name: "CV importé — Candidat 2", candidateName: "David M.", email: "david@example.com", source: "Gmail", cvText: "Next.js SQL PostgreSQL recrutement" },
    { id: `gmail-cv-${Date.now()}-3`, name: "CV importé — Candidat 3", candidateName: "Sarah K.", email: "sarah@example.com", source: "Gmail", cvText: "Marketing digital CRM communication analytics" },
  ].map((cv) => ({ ...cv, recruiterEmail }));
}

export async function sendEmailFromRecruiter({
  to,
  subject,
  body,
  recruiterEmail,
}: {
  to: string;
  subject: string;
  body: string;
  recruiterEmail: string;
}) {
  const message = { id: crypto.randomUUID(), to, subject, body, recruiterEmail, sentAt: new Date().toISOString() };
  const storage = browserStorage();
  const previous = storage ? JSON.parse(storage.getItem("jobly:sent-emails") || "[]") : [];
  storage?.setItem("jobly:sent-emails", JSON.stringify([message, ...previous].slice(0, 100)));
  return { ok: true, messageId: message.id, from: recruiterEmail };
}

export async function detectReferralByEmail() {
  return [
    { id: "referral-demo-1", email: "partner@example.com", candidateEmail: "candidate@example.com", jobId: null, detectedAt: new Date().toISOString(), registered: true, commission: 5000 },
  ];
}

export async function fetchFromWhatsApp() {
  return [];
}

export type GmailConnection = {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
};

const KEY = "jobly:gmail-connection";

export function getGmailConnection(): GmailConnection {
  if (typeof window === "undefined") return { connected: false, email: null, connectedAt: null };
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "null");
    return parsed?.connected ? parsed : { connected: false, email: null, connectedAt: null };
  } catch {
    return { connected: false, email: null, connectedAt: null };
  }
}

export async function refreshGmailConnection(): Promise<GmailConnection> {
  const { getSupabaseClient } = await import("./supabase");
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { connected: false, email: null, connectedAt: null };

  const res = await fetch("/api/recruiter/gmail/status", {
    headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    cache: "no-store",
  });
  const result = res.ok ? await res.json() : { connected: false, email: null, connectedAt: null };
  if (typeof window !== "undefined") {
    if (result.connected) localStorage.setItem(KEY, JSON.stringify(result));
    else localStorage.removeItem(KEY);
  }
  return result;
}

export async function connectGmail(): Promise<void> {
  const { getSupabaseClient } = await import("./supabase");
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Session Jobly requise.");

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=/recruiter/settings&gmail=1`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
        scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
      },
    },
  });
  if (error) throw new Error(error.message || "Connexion Google impossible.");
}

export async function disconnectGmail(): Promise<void> {
  const { getSupabaseClient } = await import("./supabase");
  const { data } = await getSupabaseClient().auth.getSession();
  if (data.session) {
    await fetch("/api/recruiter/gmail/status", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
  }
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}

export async function fetchCVsFromGmail(): Promise<never[]> {
  throw new Error("L'import Gmail réel arrive dans l'étape d'ingestion serveur sécurisée.");
}

export async function sendEmailFromRecruiter({
  to,
  subject,
  body,
}: { to: string; subject: string; body: string }) {
  const { getSupabaseClient } = await import("./supabase");
  const { data } = await getSupabaseClient().auth.getSession();
  if (!data.session) throw new Error("Session Jobly requise.");

  const res = await fetch("/api/recruiter/gmail/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
    body: JSON.stringify({ to, subject, body }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Envoi Gmail impossible.");
  return result;
}

export async function detectReferralByEmail() { return []; }
export async function fetchFromWhatsApp() { return []; }

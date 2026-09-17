export type GmailConnection = {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
};

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

export async function getGmailConnection(): Promise<GmailConnection> {
  const { getSupabaseClient } = await import("./supabase");
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { connected: false, email: null, connectedAt: null };

  const res = await fetch("/api/recruiter/gmail/status", {
    headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
    cache: "no-store",
  });
  if (!res.ok) return { connected: false, email: null, connectedAt: null };
  return res.json();
}

export function disconnectGmail(): void {
  // Disconnection is server-side; the UI calls the API route when it needs to revoke the stored connection.
}

export async function fetchCVsFromGmail(): Promise<never[]> {
  throw new Error("L'import Gmail réel est en cours de raccordement au moteur serveur sécurisé.");
}

export async function sendEmailFromRecruiter({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) {
  const { getSupabaseClient } = await import("./supabase");
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Session Jobly requise.");

  const res = await fetch("/api/recruiter/gmail/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ to, subject, body }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.message || "Envoi Gmail impossible.");
  return result;
}

export async function detectReferralByEmail() {
  return [];
}

export async function fetchFromWhatsApp() {
  return [];
}

import { getSupabaseClient } from "./supabase";

function translateAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "Username ou mot de passe incorrect.";
  if (normalized.includes("email not confirmed")) return "Votre adresse e-mail doit d'abord être confirmée.";
  if (normalized.includes("user not found") || normalized.includes("signups not allowed")) return "Aucun compte JOBLY ne correspond à ces informations.";
  if (normalized.includes("too many requests")) return "Trop de tentatives. Patientez quelques instants puis réessayez.";
  if (normalized.includes("rate limit")) return "Trop de demandes de code. Patientez quelques instants puis réessayez.";
  if (normalized.includes("password")) return "Le mot de passe ne respecte pas les règles de sécurité.";
  return message || "Opération impossible. Réessayez.";
}

export function validatePassword(password: string) {
  if (password.length < 6) return "Le mot de passe doit contenir au moins 6 caractères.";
  if (!/[a-z]/.test(password)) return "Le mot de passe doit contenir une minuscule.";
  if (!/[A-Z]/.test(password)) return "Le mot de passe doit contenir une majuscule.";
  if (!/\d/.test(password)) return "Le mot de passe doit contenir un chiffre.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Le mot de passe doit contenir un caractère spécial.";
  return null;
}

export async function requestEmailOtp(email: string) {
  const value = email.trim().toLowerCase();
  if (!value.includes("@")) throw new Error("Entre une adresse e-mail valide.");
  const { error } = await getSupabaseClient().auth.signInWithOtp({
    email: value,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
    },
  });
  if (error) throw new Error(translateAuthError(error.message));
  return { email: value };
}

export async function verifyEmailOtp(email: string, token: string) {
  const value = email.trim().toLowerCase();
  const { data, error } = await getSupabaseClient().auth.verifyOtp({ email: value, token, type: "email" });
  if (error) throw new Error(translateAuthError(error.message));
  if (!data.session) throw new Error("Le code est valide mais la session n'a pas pu être créée.");
  return data;
}

export async function loginWithUsernamePassword(username: string, password: string) {
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);
  const response = await fetch("/api/auth/username/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: username.trim(), password }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Connexion impossible.");
  const { access_token, refresh_token } = body;
  if (!access_token || !refresh_token) throw new Error("La session n'a pas pu être créée.");
  const { data, error } = await getSupabaseClient().auth.setSession({ access_token, refresh_token });
  if (error) throw new Error(translateAuthError(error.message));
  return data;
}

export async function completeSignupProfile(payload: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  username: string;
  privacyAccepted: boolean;
}) {
  // Bug du 14/09/2026 : ce fetch n'envoyait jamais le token de la session
  // créée par verifyEmailOtp(), donc le serveur (getAuthUser) ne voyait
  // jamais d'utilisateur connecté et répondait "Session requise après
  // vérification de l'e-mail." même quand l'OTP venait d'être validé avec
  // succès. On récupère explicitement la session courante et on l'attache
  // en Authorization: Bearer.
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  let accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Ta session a expiré après la vérification de l'e-mail. Reviens à l'étape précédente et vérifie ton code à nouveau.");

  async function callApi(token: string) {
    const response = await fetch("/api/auth/complete-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, body };
  }

  let result = await callApi(accessToken);
  // 14/09/2026 : filet de sécurité contre le "Session requise après
  // vérification de l'e-mail." intermittent — si le token en mémoire vient
  // d'être renouvelé côté serveur Supabase (juste après updateUser()), on
  // force un rafraîchissement local puis on retente une seule fois avant
  // d'abandonner.
  if (!result.ok && result.status === 401) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    accessToken = refreshed.session?.access_token;
    if (accessToken) result = await callApi(accessToken);
  }
  if (!result.ok) throw new Error(result.body.message || "Impossible de finaliser le compte.");
  return result.body;
}

// 15/09/2026 : sur demande, la seule contrainte sur le username est
// désormais l'unicité — plus de règle de format (lettres/chiffres/./_
// uniquement, 3-15 caractères). On garde un garde-fou technique minimal
// (non vide, longueur raisonnable pour la colonne en base) mais on ne
// rejette plus un username pour sa forme.
export function isValidUsernameFormat(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 40;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const value = username.trim().toLowerCase();
  if (!isValidUsernameFormat(value)) return false;
  const response = await fetch(`/api/auth/username/check?username=${encodeURIComponent(value)}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Vérification du username impossible.");
  return Boolean(body.available);
}

export async function requestPasswordReset(email: string) {
  const value = email.trim().toLowerCase();
  if (!value.includes("@")) throw new Error("Entre l'adresse e-mail associée au compte.");
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(value, {
    redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
  });
  if (error) throw new Error(translateAuthError(error.message));
}

export async function updatePassword(password: string) {
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);
  const { error } = await getSupabaseClient().auth.updateUser({ password });
  if (error) throw new Error(translateAuthError(error.message));
}

export async function signInWithGoogle() {
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw new Error(error.message || "Connexion Google impossible.");
}

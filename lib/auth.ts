import { getSupabaseClient } from "./supabase";
import { getJoblySessionManager } from "./session-manager";

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
  const session = await getJoblySessionManager().setSession(access_token, refresh_token);
  return { session, user: session.user };
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
  const sessionManager = getJoblySessionManager();
  const token = await sessionManager.getAccessToken();
  if (!token) {
    throw new Error("Ta session a expiré après la vérification de l'e-mail. Reviens à l'étape précédente et vérifie ton code à nouveau.");
  }

  const response = await sessionManager.authenticatedFetch("/api/auth/complete-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Impossible de finaliser le compte.");
  return body;
}
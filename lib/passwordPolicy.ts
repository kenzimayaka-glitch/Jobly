/**
 * JOBLY password creation and reset policy.
 *
 * Keep this stricter policy separate from the legacy sign-in validator so
 * existing accounts are not locked out when the creation policy is improved.
 */
export const MIN_NEW_PASSWORD_LENGTH = 12;
const ALLOWED_SPECIAL_CHARACTER_CODES = new Set([33, 64, 35, 36, 37, 94, 38, 42, 40, 41, 95, 43, 45, 61, 91, 93, 123, 125, 59, 39, 92, 58, 34, 124, 60, 62, 63, 44, 46, 47, 96, 126]);

export function validateNewPassword(password: string): string | null {
  if (password.length < MIN_NEW_PASSWORD_LENGTH) {
    return `Le nouveau mot de passe doit contenir au moins ${MIN_NEW_PASSWORD_LENGTH} caractères.`;
  }
  if (!/[a-z]/.test(password)) {
    return "Le nouveau mot de passe doit contenir une lettre minuscule.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Le nouveau mot de passe doit contenir une lettre majuscule.";
  }
  if (!/[0-9]/.test(password)) {
    return "Le nouveau mot de passe doit contenir un chiffre.";
  }
  if (![...password].some((character) => ALLOWED_SPECIAL_CHARACTER_CODES.has(character.charCodeAt(0)))) {
    return "Le nouveau mot de passe doit contenir un symbole spécial autorisé.";
  }
  return null;
}

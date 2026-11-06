/**
 * JOBLY password creation and reset policy.
 *
 * Keep this stricter policy separate from the legacy sign-in validator so
 * existing accounts are not locked out when the creation policy is improved.
 */
export const MIN_NEW_PASSWORD_LENGTH = 12;

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
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Le nouveau mot de passe doit contenir un symbole.";
  }
  return null;
}

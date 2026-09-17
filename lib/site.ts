/** Central public URL used for shareable JOBLY links.
 * Configure NEXT_PUBLIC_JOBLY_PUBLIC_URL in Vercel for the production domain.
 */
export const JOBLY_PUBLIC_URL = (
  process.env.NEXT_PUBLIC_JOBLY_PUBLIC_URL || process.env.JOBLY_PUBLIC_URL || "https://jobly.cm"
).replace(/\/+$/, "");

export function jobPublicUrl(id: string, source?: string) {
  const qs = source ? `?source=${encodeURIComponent(source)}` : "";
  return `${JOBLY_PUBLIC_URL}/jobs/${encodeURIComponent(id)}${qs}`;
}

export const JOBLY_PUBLIC_HOST = JOBLY_PUBLIC_URL.replace(/^https?:\/\//, "");

export function passUrl(code: string) {
  return `${JOBLY_PUBLIC_URL}/pass/${encodeURIComponent(code)}`;
}

export function referralUrl(code: string) {
  return `${JOBLY_PUBLIC_URL}/join?ref=${encodeURIComponent(code)}`;
}

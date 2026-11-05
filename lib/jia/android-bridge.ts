import type { ExternalApplicationContext } from "@/lib/jia/external-application";

export type AndroidExternalFormAnswer = {
  index: number;
  label: string;
  type: string;
  answer: string;
};

declare global {
  interface Window {
    joblyAndroid?: {
      postMessage: (message: string) => void;
    };
  }
}

/**
 * Ask the Jobly Android shell to open an external promoter URL in its single
 * embedded WebView. Returns false on web/PWA or for non-HTTPS targets so the
 * caller can use the ordinary browser fallback.
 */
export function openExternalApplicationInAndroid(context: ExternalApplicationContext): boolean {
  if (typeof window === "undefined" || typeof window.joblyAndroid?.postMessage !== "function") {
    return false;
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(String(context.targetUrl || context.sourceUrl || ""));
  } catch {
    return false;
  }
  if (targetUrl.protocol !== "https:" || targetUrl.username || targetUrl.password) return false;

  const payload = {
    type: "OPEN_EXTERNAL_APPLICATION",
    payload: {
      jobId: String(context.jobId || "").slice(0, 120),
      source: String(context.source || "").slice(0, 40),
      title: String(context.title || "").slice(0, 240),
      company: String(context.company || "").slice(0, 180),
      targetUrl: targetUrl.toString(),
      sourceUrl: context.sourceUrl || targetUrl.toString(),
      description: String(context.description || "").slice(0, 3000),
    },
  };

  try {
    window.joblyAndroid.postMessage(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/** True only inside the Jobly Android WebView, never in the ordinary browser/PWA. */
export function isJoblyAndroidShellAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.joblyAndroid?.postMessage === "function";
}

/**
 * Send explicitly reviewed answers to the native shell. The native side checks
 * the current assistant route and re-validates every field before touching
 * the promoter DOM. It never submits the form.
 */
export function applyExternalFormAnswersInAndroid(answers: AndroidExternalFormAnswer[]): boolean {
  if (!isJoblyAndroidShellAvailable() || !Array.isArray(answers) || answers.length === 0) return false;

  const fields = answers.slice(0, 10).map((item) => ({
    index: Number.isInteger(item.index) ? item.index : -1,
    label: String(item.label || "").slice(0, 80),
    type: String(item.type || "").slice(0, 20),
    answer: String(item.answer || "").trim().slice(0, 500),
  })).filter((item) => item.index >= 0 && item.label && item.answer &&
    ["text", "email", "tel", "url", "search", "textarea", "select"].includes(item.type));

  if (fields.length === 0) return false;

  try {
    window.joblyAndroid!.postMessage(JSON.stringify({
      type: "APPLY_EXTERNAL_FORM_ANSWERS",
      payload: { fields },
    }));
    return true;
  } catch {
    return false;
  }
}

import type { ExternalApplicationContext } from "@/lib/jia/external-application";

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

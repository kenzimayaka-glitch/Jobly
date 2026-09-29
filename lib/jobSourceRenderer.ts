import { URL } from "node:url";

export type RenderedSource = {
  html: string;
  mode: "browser" | "fetch";
  finalUrl: string;
};

function normalizeRendererUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

/**
 * Render an offer page when a browser renderer is configured.
 *
 * Contract:
 * POST JOB_RENDERER_URL
 * JSON: { url, waitUntil: "networkidle", waitMs }
 * Response: raw HTML or JSON { html, finalUrl }.
 */
export async function renderPublicSource(url: string): Promise<RenderedSource> {
  const rendererUrl = process.env.JOB_RENDERER_URL;
  const rendererToken = process.env.JOB_RENDERER_TOKEN;

  if (rendererUrl) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.min(Math.max(Number(process.env.JOB_RENDERER_TIMEOUT_MS || 20000), 5000), 45000),
    );

    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        accept: "text/html,application/json",
      };
      if (rendererToken) headers.authorization = `Bearer ${rendererToken}`;

      const response = await fetch(normalizeRendererUrl(rendererUrl), {
        method: "POST",
        headers,
        body: JSON.stringify({
          url,
          waitUntil: "networkidle",
          waitMs: Math.min(Math.max(Number(process.env.JOB_RENDERER_WAIT_MS || 1200), 0), 10000),
        }),
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`RENDERER_HTTP_${response.status}`);
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await response.json() as { html?: unknown; finalUrl?: unknown };
        if (typeof body.html !== "string" || body.html.length < 100) {
          throw new Error("RENDERER_EMPTY_HTML");
        }
        return {
          html: body.html,
          mode: "browser",
          finalUrl: typeof body.finalUrl === "string" && body.finalUrl ? body.finalUrl : url,
        };
      }

      const html = await response.text();
      if (html.length < 100) throw new Error("RENDERER_EMPTY_HTML");
      return { html, mode: "browser", finalUrl: response.url || url };
    } finally {
      clearTimeout(timer);
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "JoblyOfferCollector/2.0 (+https://jobly-c0651.vercel.app)",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html") && !type.includes("application/xhtml")) {
      throw new Error("SOURCE_NOT_HTML");
    }
    return { html: await response.text(), mode: "fetch", finalUrl: response.url || url };
  } finally {
    clearTimeout(timer);
  }
}

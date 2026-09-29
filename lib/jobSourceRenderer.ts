import { URL } from "node:url";

export type RenderedSource = {
  html: string;
  mode: "browser" | "fetch";
  finalUrl: string;
};

const MIN_HTML_LENGTH = 100;
const MAX_HTML_BYTES = 8_000_000;

function normalizeRendererUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

function clampTimeout(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 5_000), 45_000) : fallback;
}

function assertHtml(html: string): string {
  if (typeof html !== "string" || html.length < MIN_HTML_LENGTH) {
    throw new Error("RENDERER_EMPTY_HTML");
  }
  if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
    throw new Error("RENDERER_HTML_TOO_LARGE");
  }
  return html;
}

async function renderWithCloudflare(url: string): Promise<RenderedSource> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();

  if (!accountId || !apiToken) {
    throw new Error("CLOUDFLARE_BROWSER_RENDERING_NOT_CONFIGURED");
  }

  const endpoint =
    "https://api.cloudflare.com/client/v4/accounts/" +
    encodeURIComponent(accountId) +
    "/browser-run/content";

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    clampTimeout(process.env.JOB_RENDERER_TIMEOUT_MS, 30_000),
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json,text/html",
        authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        url,
        gotoOptions: {
          waitUntil: "networkidle2",
          timeout: clampTimeout(process.env.JOB_RENDERER_PAGE_TIMEOUT_MS, 30_000),
        },
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`CLOUDFLARE_RENDERER_HTTP_${response.status}:${detail}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await response.json() as {
        success?: boolean;
        result?: unknown;
        errors?: Array<{ message?: string }>;
      };

      if (body.success === false) {
        throw new Error(
          body.errors?.map((error) => error.message).filter(Boolean).join("; ") ||
            "CLOUDFLARE_RENDERER_FAILED",
        );
      }

      const html = assertHtml(
        typeof body.result === "string" ? body.result : "",
      );
      return { html, mode: "browser", finalUrl: url };
    }

    return {
      html: assertHtml(await response.text()),
      mode: "browser",
      finalUrl: url,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function renderWithGenericRenderer(url: string): Promise<RenderedSource> {
  const rendererUrl = process.env.JOB_RENDERER_URL;
  if (!rendererUrl) throw new Error("JOB_RENDERER_NOT_CONFIGURED");

  const rendererToken = process.env.JOB_RENDERER_TOKEN;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    clampTimeout(process.env.JOB_RENDERER_TIMEOUT_MS, 20_000),
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
        waitMs: Math.min(
          Math.max(Number(process.env.JOB_RENDERER_WAIT_MS || 1200), 0),
          10_000,
        ),
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`RENDERER_HTTP_${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await response.json() as { html?: unknown; finalUrl?: unknown };
      const html = assertHtml(typeof body.html === "string" ? body.html : "");
      return {
        html,
        mode: "browser",
        finalUrl:
          typeof body.finalUrl === "string" && body.finalUrl ? body.finalUrl : url,
      };
    }

    return {
      html: assertHtml(await response.text()),
      mode: "browser",
      finalUrl: response.url || url,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Render a public offer page before extracting its content.
 *
 * Provider order:
 * 1. Cloudflare Browser Run when JOB_RENDERER_PROVIDER=cloudflare.
 * 2. Existing generic browser renderer when JOB_RENDERER_URL is configured.
 * 3. Plain HTTP fetch as the deterministic fallback.
 *
 * Cloudflare Browser Run's /content endpoint executes JavaScript and returns
 * the fully rendered HTML, which makes it suitable for SPA/JS-heavy sources.
 */
export async function renderPublicSource(url: string): Promise<RenderedSource> {
  const provider = process.env.JOB_RENDERER_PROVIDER?.trim().toLowerCase();

  if (provider === "cloudflare") {
    return renderWithCloudflare(url);
  }

  if (process.env.JOB_RENDERER_URL) {
    return renderWithGenericRenderer(url);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
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

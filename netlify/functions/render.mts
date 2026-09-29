import { chromium as chromiumBinary } from "@sparticuz/chromium";
import { chromium } from "playwright-core";

const MAX_HTML_BYTES = 8_000_000;
const DEFAULT_WAIT_MS = 1200;
const MAX_WAIT_MS = 5000;
const REQUEST_TIMEOUT_MS = 20_000;

function clampWait(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_WAIT_MS;
  return Math.max(0, Math.min(MAX_WAIT_MS, parsed));
}

function isAllowedUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
  }

  const expectedToken = Netlify.env.get("JOB_RENDERER_TOKEN");
  if (!expectedToken) {
    return Response.json({ ok: false, error: "renderer_not_configured" }, { status: 503 });
  }

  const suppliedToken = req.headers.get("authorization")?.replace(/^Bearer\\s+/i, "");
  if (!suppliedToken || suppliedToken !== expectedToken) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { url?: unknown; waitMs?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isAllowedUrl(body.url)) {
    return Response.json({ ok: false, error: "invalid_url" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({
      args: chromiumBinary.args,
      executablePath: await chromiumBinary.executablePath(),
      headless: true,
    });

    const page = await browser.newPage({
      viewport: { width: 1440, height: 1200 },
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 JoblyRenderer/1.0",
      locale: "fr-FR",
      colorScheme: "light",
    });

    await page.goto(body.url, {
      waitUntil: "networkidle",
      timeout: REQUEST_TIMEOUT_MS,
    });

    const waitMs = clampWait(body.waitMs);
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    const html = await page.content();
    const finalUrl = page.url();

    if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
      return Response.json({ ok: false, error: "html_too_large" }, { status: 413 });
    }

    return Response.json({
      ok: true,
      html,
      finalUrl,
      rendered: true,
      waitedMs: waitMs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "render_failed";
    return Response.json(
      { ok: false, error: "render_failed", message: message.slice(0, 500) },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
};

export const config = {
  path: "/render",
};

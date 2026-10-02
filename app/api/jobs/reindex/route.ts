import { NextRequest } from "next/server";
import { POST as ingestSources } from "../ingest/sources/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Public scheduler entrypoint for the incremental offer reindexer.
 * Authentication/authorization remains centralized in the source-ingestion
 * route, so cron and authenticated manual runs use the same guard.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  url.searchParams.set("mode", "reindex");
  if (!url.searchParams.has("limit")) url.searchParams.set("limit", "40");
  if (!url.searchParams.has("offset")) url.searchParams.set("offset", "0");

  const forwarded = new NextRequest(url, {
    method: "POST",
    headers: request.headers,
  });
  return ingestSources(forwarded);
}

export async function POST(request: NextRequest) {
  return GET(request);
}

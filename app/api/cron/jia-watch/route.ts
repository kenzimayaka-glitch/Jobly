import { NextResponse } from "next/server";
import { listDueWatchSubscriptions, runPersistentWatch } from "@/lib/jia/watchPersistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const subscriptions = await listDueWatchSubscriptions();
  const results = [];

  for (const subscription of subscriptions) {
    try {
      results.push({
        subscriptionId: subscription.id,
        ...(await runPersistentWatch(subscription)),
      });
    } catch (error) {
      results.push({
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : "Veille indisponible.",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    checked: subscriptions.length,
    results,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { ensureUser, adminClient, getAuthUser } from "@/lib/server-auth";
import { defaultWatchTargets } from "@/lib/jia/watcher";
import { createOrUpdateWatchSubscription } from "@/lib/jia/watchPersistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

  const sb = adminClient();
  const user = await ensureUser(sb, auth);
  const { data, error } = await sb
    .from("JiaWatchSubscription")
    .select("*")
    .eq("userId", user.id)
    .order("createdAt", { ascending: true });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ subscriptions: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const key = typeof body?.key === "string" ? body.key : "";
    const target = defaultWatchTargets().find((item) => item.key === key);
    if (!target) {
      return NextResponse.json({ message: "Cible de veille inconnue." }, { status: 400 });
    }

    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const subscription = await createOrUpdateWatchSubscription(user.id, target, {
      country: typeof body?.country === "string" ? body.country : undefined,
      frequencyMinutes: typeof body?.frequencyMinutes === "number" ? body.frequencyMinutes : undefined,
      notificationMode: typeof body?.notificationMode === "string" ? body.notificationMode : undefined,
      validationMode: typeof body?.validationMode === "string" ? body.validationMode : undefined,
    });

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Veille indisponible." },
      { status: 500 },
    );
  }
}

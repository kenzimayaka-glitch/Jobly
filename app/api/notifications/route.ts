import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../../lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const supabase = adminClient();
    const user = await ensureUser(supabase, authUser);
    const url = new URL(req.url);
    const applicationId = url.searchParams.get("applicationId");

    let query = supabase
      .from("Notification")
      .select("id,type,title,body,link,entityId,readAt,createdAt,recruitmentId,applicationId,actionType,actionPayload,locale,channels,openedAt,recruiterSeenAt")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })
      .limit(100);

    if (applicationId) query = query.eq("applicationId", applicationId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ notifications: data || [] });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Impossible de charger les notifications." },
      { status: 500 }
    );
  }
}

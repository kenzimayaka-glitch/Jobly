import { NextRequest, NextResponse } from "next/server";
import { authUser, adminClient, ensureUser } from "../../../lib/mobilityServer";

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const { data: identity, error: identityError } = await db.from("AdminIdentity")
      .select("active")
      .eq("authUserId", auth.id)
      .eq("ownerUserId", user.id)
      .maybeSingle();

    // The public /me endpoint must remain available during staged schema rollout.
    const canSwitchAdmin = !identityError && identity?.active === true;
    return NextResponse.json({ user, capabilities: { canSwitchAdmin } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Profil indisponible." }, { status: 500 });
  }
}

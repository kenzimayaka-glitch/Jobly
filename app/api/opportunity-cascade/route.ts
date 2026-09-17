import { NextRequest, NextResponse } from "next/server";
import { ensureUser, getAuthUser, adminClient } from "../../../lib/server-auth";
import { getCascadeOpportunities } from "../../../lib/opportunityAggregator";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const user = await ensureUser(adminClient(), auth);
    const opportunities = await getCascadeOpportunities(user.id);
    return NextResponse.json({ opportunities, count: opportunities.length });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Opportunités indisponibles." }, { status: 500 });
  }
}

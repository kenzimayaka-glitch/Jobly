import { NextResponse } from "next/server";
import { getDistributorCommission } from "../../../../../lib/distributor";

export async function GET(request: Request) {
  const plan = new URL(request.url).searchParams.get("plan");
  return NextResponse.json({ plan: plan?.toUpperCase() ?? null, commissionXaf: getDistributorCommission(plan) });
}

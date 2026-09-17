import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    partnerType: "DISTRIBUTOR",
    commissionRules: { PREMIUM: 5000, PRO: 10000 },
    eligiblePlans: ["PREMIUM", "PRO"],
    monthlyObjective: null,
  });
}

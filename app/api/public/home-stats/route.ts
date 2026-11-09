import { NextResponse } from "next/server";
import { adminClient } from "../../../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PublicHomeStats = {
  offersCount: number;
  talentsCount: number;
  updatedAt: string;
};

export async function GET() {
  try {
    // The aggregate RPC is deliberately server-only after the least-privilege
    // migration. Never expose this call through the publishable/anonymous client.
    const supabase = adminClient();
    const { data, error } = await supabase.rpc("get_public_home_stats");
    if (error) throw error;

    const row = (Array.isArray(data) ? data[0] : data) as PublicHomeStats | null;
    if (
      !row ||
      !Number.isFinite(Number(row.offersCount)) ||
      !Number.isFinite(Number(row.talentsCount)) ||
      typeof row.updatedAt !== "string"
    ) {
      throw new Error("The public homepage statistics response is invalid.");
    }

    return NextResponse.json(
      {
        offersCount: Number(row.offersCount),
        talentsCount: Number(row.talentsCount),
        updatedAt: row.updatedAt,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=30",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { message: "Les statistiques publiques sont momentanément indisponibles." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

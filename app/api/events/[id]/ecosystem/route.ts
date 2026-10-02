import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "../../../../../lib/server-auth";
import { buildEventEcosystemConnections } from "../../../../../lib/eventEcosystem";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const sb = adminClient();
  const { data, error } = await sb.from("Event").select("id,title,description,domain,subdomains,city,audience,startAt").eq("id", id).eq("status", "PUBLISHED").maybeSingle();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ message: "Événement introuvable." }, { status: 404 });
  return NextResponse.json({ eventId: id, ecosystem: buildEventEcosystemConnections(data) });
}

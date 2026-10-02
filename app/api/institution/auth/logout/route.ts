import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "../../../../../lib/server-auth";
import { clearInstitutionCookie, getInstitutionSession } from "../../../../../lib/institution-auth";

export async function POST(request: NextRequest) {
  const session = await getInstitutionSession(request);
  if (session) {
    await adminClient().from("InstitutionSession").update({ revokedAt: new Date().toISOString() }).eq("id", session.sessionId);
  }
  const response = NextResponse.json({ ok: true });
  clearInstitutionCookie(response);
  return response;
}

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient } from "../../../../lib/server-auth";
import { createInstitutionSession, hashPassword, setInstitutionCookie } from "../../../../lib/institution-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const login = String(body.login || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!login || !password) return NextResponse.json({ message: "Identifiants institutionnels requis." }, { status: 400 });

    const db = adminClient();
    const { data: access, error } = await db
      .from("InstitutionAccess")
      .select("id, institutionId, login, passwordHash, passwordSalt, active, Institution(id,name,city,type,active)")
      .eq("login", login)
      .maybeSingle();

    if (error) throw new Error(error.message);
    const institution = Array.isArray(access?.Institution) ? access?.Institution[0] : access?.Institution;
    if (!access?.active || !institution?.active) {
      return NextResponse.json({ message: "Identifiants institutionnels incorrects." }, { status: 401 });
    }

    const actual = await hashPassword(password, access.passwordSalt);
    const valid = crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(access.passwordHash, "hex"));
    if (!valid) return NextResponse.json({ message: "Identifiants institutionnels incorrects." }, { status: 401 });

    const { token, expiresAt } = await createInstitutionSession(access.id);
    await db.from("InstitutionAccess").update({ lastLoginAt: new Date().toISOString() }).eq("id", access.id);

    const response = NextResponse.json({ institution: { id: institution.id, name: institution.name, city: institution.city, type: institution.type } });
    setInstitutionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Connexion institutionnelle impossible." }, { status: 500 });
  }
}

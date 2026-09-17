import { NextRequest, NextResponse } from "next/server";
import { candidateContext } from "../../../../../../lib/candidateGmail";

export async function GET(request: NextRequest) {
  try {
    const context = await candidateContext(request);
    if (!context) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const { data, error } = await context.supabase
      .from("CandidateGmailConnection")
      .select("googleEmail,connectedAt,updatedAt,scopes")
      .eq("userId", context.user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return NextResponse.json({
      connected: Boolean(data),
      email: data?.googleEmail || null,
      connectedAt: data?.connectedAt || null,
      scopes: data?.scopes || [],
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Statut Gmail indisponible." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await candidateContext(request);
    if (!context) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const { error } = await context.supabase.from("CandidateGmailConnection").delete().eq("userId", context.user.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ connected: false, email: null, connectedAt: null, scopes: [] });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Déconnexion Gmail impossible." }, { status: 500 });
  }
}

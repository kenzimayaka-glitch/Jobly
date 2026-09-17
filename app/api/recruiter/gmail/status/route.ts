import { NextRequest, NextResponse } from "next/server";
import { recruiterContext } from "../../../../../../lib/gmailServer";

export async function GET(req: NextRequest) {
  try {
    const context = await recruiterContext(req);
    if (!context) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const { data, error } = await context.supabase
      .from("RecruiterGmailConnection")
      .select("googleEmail,connectedAt,updatedAt")
      .eq("recruiterUserId", context.user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return NextResponse.json({
      connected: Boolean(data),
      email: data?.googleEmail || null,
      connectedAt: data?.connectedAt || null,
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Statut Gmail indisponible." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const context = await recruiterContext(req);
    if (!context) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const { error } = await context.supabase.from("RecruiterGmailConnection").delete().eq("recruiterUserId", context.user.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ connected: false, email: null, connectedAt: null });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Déconnexion Gmail impossible." }, { status: 500 });
  }
}

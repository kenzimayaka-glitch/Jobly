import { NextRequest, NextResponse } from "next/server";
import { adminClient, authUser, ensureUser } from "../../../../../lib/mobilityServer";
import { enforceApiRateLimit } from "../../../../../lib/server-security";

export async function GET(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const limited = await enforceApiRateLimit(req, db, {
      scope: "mobility-provider-assignments-read",
      identity: user.id,
      accountWindows: [{ limit: 30, windowSeconds: 60 }, { limit: 200, windowSeconds: 3600 }],
      ipWindows: [{ limit: 60, windowSeconds: 60 }, { limit: 400, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const { data: provider, error: providerError } = await db.from("MobilityServiceProvider")
      .select("id,status,kycStatus")
      .eq("userId", user.id)
      .maybeSingle();
    if (providerError) throw new Error(providerError.message);
    if (!provider || provider.status !== "ACTIVE" || provider.kycStatus !== "VERIFIED") {
      return NextResponse.json({ message: "Prestataire Mobility vérifié et actif requis." }, { status: 403 });
    }
    const { data, error } = await db.from("MobilityProviderAssignment")
      .select("id,mobilityRequestId,serviceId,status,agreedAmount,currency,notes,acceptedAt,completedAt,createdAt,MobilityProviderService(title,serviceType,city),MobilityRequest(departCity,arriveeCity,distanceKm,status,costTotal)")
      .eq("providerId", provider.id)
      .order("createdAt", { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json({ assignments: data || [] }, { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Demandes prestataire indisponibles." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 8 * 1024) return NextResponse.json({ message: "Mise à jour d'affectation trop volumineuse." }, { status: 413 });
    const body = await req.json().catch(() => ({}));
    const assignmentId = String(body.assignmentId || "").trim();
    const nextStatus = String(body.status || "").toUpperCase();
    if (!assignmentId || !["ACCEPTED", "DECLINED", "IN_PROGRESS", "COMPLETED"].includes(nextStatus)) {
      return NextResponse.json({ message: "Affectation ou statut invalide." }, { status: 400 });
    }
    const db = adminClient();
    const user = await ensureUser(db, auth);
    const limited = await enforceApiRateLimit(req, db, {
      scope: "mobility-provider-assignment-update",
      identity: user.id,
      accountWindows: [{ limit: 10, windowSeconds: 60 }, { limit: 60, windowSeconds: 3600 }],
      ipWindows: [{ limit: 20, windowSeconds: 60 }, { limit: 120, windowSeconds: 3600 }],
      requireIp: true,
    });
    if (limited) return limited;
    const { data: provider, error: providerError } = await db.from("MobilityServiceProvider")
      .select("id,status,kycStatus")
      .eq("userId", user.id)
      .maybeSingle();
    if (providerError) throw new Error(providerError.message);
    if (!provider || provider.status !== "ACTIVE" || provider.kycStatus !== "VERIFIED") {
      return NextResponse.json({ message: "Prestataire Mobility vérifié et actif requis." }, { status: 403 });
    }
    const { data: current, error: currentError } = await db.from("MobilityProviderAssignment")
      .select("id,status,mobilityRequestId,acceptedAt,completedAt")
      .eq("id", assignmentId)
      .eq("providerId", provider.id)
      .maybeSingle();
    if (currentError) throw new Error(currentError.message);
    if (!current) return NextResponse.json({ message: "Affectation introuvable." }, { status: 404 });

    const allowed: Record<string, string[]> = {
      PROPOSED: ["ACCEPTED", "DECLINED"],
      ACCEPTED: ["IN_PROGRESS"],
      IN_PROGRESS: ["COMPLETED"],
      DECLINED: [],
      COMPLETED: [],
      CANCELLED: [],
    };
    if (!allowed[String(current.status)]?.includes(nextStatus)) {
      return NextResponse.json({ message: "Transition d'affectation non autorisée." }, { status: 409 });
    }
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { status: nextStatus, updatedAt: now };
    if (nextStatus === "ACCEPTED") updates.acceptedAt = now;
    if (nextStatus === "COMPLETED") updates.completedAt = now;
    const { data, error } = await db.from("MobilityProviderAssignment")
      .update(updates)
      .eq("id", assignmentId)
      .eq("providerId", provider.id)
      .select("id,status,acceptedAt,completedAt")
      .single();
    if (error) throw new Error(error.message);
    const { error: eventError } = await db.from("MobilityProcessEvent").insert({
      mobilityRequestId: current.mobilityRequestId,
      actorUserId: user.id,
      actorRole: "MOBILITY_PROVIDER",
      eventType: "PROVIDER_ASSIGNMENT_" + nextStatus,
      fromStatus: current.status,
      toStatus: nextStatus,
      title: "Mise à jour du service partenaire",
      description: "Le prestataire a mis à jour l'état de sa mission.",
      metadata: { assignmentId },
      visibleToTalent: true,
      visibleToRecruiter: true,
      visibleToInstitution: true,
    });
    if (eventError) {
      const rollback = await db.from("MobilityProviderAssignment").update({
        status: current.status,
        acceptedAt: current.acceptedAt,
        completedAt: current.completedAt,
        updatedAt: new Date().toISOString(),
      }).eq("id", assignmentId).eq("providerId", provider.id);
      if (rollback.error) {
        return NextResponse.json({ message: "L'audit a échoué et le retour arrière a aussi échoué: " + rollback.error.message, auditError: eventError.message, rollbackError: true }, { status: 500 });
      }
      return NextResponse.json({ message: "Transition annulée car l'événement d'audit n'a pas pu être écrit: " + eventError.message, rolledBack: true }, { status: 500 });
    }
    return NextResponse.json({ assignment: data });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Mise à jour de l'affectation impossible." }, { status: 500 });
  }
}

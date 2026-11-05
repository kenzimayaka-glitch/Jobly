import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "../../../../../../lib/server-auth";
import { EVENT_MANUAL_PAYMENT_METHODS, getEventManualPaymentInstructions } from "../../../../../../lib/eventManualPayments";

const fail = (message: string, status = 400, code = "MANUAL_PAYMENT_ERROR") =>
  NextResponse.json({ message, error: code }, { status });

async function paymentContext(paymentId: string, userId: string) {
  const sb = adminClient();
  const { data: payment, error: paymentError } = await sb.from("Payment")
    .select("id,userId,provider,amount,currency,status,feature,createdAt")
    .eq("id", paymentId).eq("userId", userId).maybeSingle();
  if (paymentError) throw new Error(paymentError.message);
  if (!payment || payment.provider !== "MANUAL") return { error: "PAYMENT_NOT_FOUND" as const };
  const { data: publication, error: publicationError } = await sb.from("EventPayment")
    .select("id,eventId,purpose,amount").eq("paymentId", paymentId).maybeSingle();
  if (publicationError) throw new Error(publicationError.message);
  const { data: featured, error: featuredError } = await sb.from("EventFeaturedCampaign")
    .select("id,eventId,price,status").eq("paymentId", paymentId).maybeSingle();
  if (featuredError) throw new Error(featuredError.message);
  if (Boolean(publication) === Boolean(featured)) return { error: "PAYMENT_TARGET_INVALID" as const };
  const eventId = publication?.eventId ?? featured?.eventId;
  const { data: event, error: eventError } = await sb.from("Event")
    .select("id,title,status,organizerName").eq("id", eventId).maybeSingle();
  if (eventError) throw new Error(eventError.message);
  if (!event) return { error: "EVENT_NOT_FOUND" as const };
  const { data: submission, error: submissionError } = await sb.from("EventManualPaymentSubmission")
    .select("id,paymentMethod,transactionReference,proofPath,notes,status,submittedAt,reviewNote")
    .eq("paymentId", paymentId).maybeSingle();
  if (submissionError) throw new Error(submissionError.message);
  return { payment, publication, featured, event, submission };
}

export async function GET(request: NextRequest, context: { params: Promise<{ paymentId: string }> }) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return fail("Session requise.", 401, "UNAUTHENTICATED");
    const { paymentId } = await context.params;
    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    const result = await paymentContext(paymentId, user.id);
    if ("error" in result) return fail("Paiement introuvable ou cible invalide.", 404, result.error);
    return NextResponse.json({
      payment: {
        id: result.payment.id,
        amount: result.payment.amount,
        currency: result.payment.currency,
        status: result.payment.status,
        feature: result.payment.feature,
        createdAt: result.payment.createdAt,
      },
      event: result.event,
      purpose: result.publication ? "PUBLICATION" : "FEATURED",
      instructions: getEventManualPaymentInstructions(),
      submission: result.submission,
      canSubmit: result.payment.status === "PENDING" && !result.submission,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Paiement introuvable.", 500);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ paymentId: string }> }) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return fail("Session requise.", 401, "UNAUTHENTICATED");
    const { paymentId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const paymentMethod = String(body.paymentMethod ?? "").toUpperCase();
    const transactionReference = String(body.transactionReference ?? "").trim();
    const proofPath = String(body.proofPath ?? "").trim();
    const notes = String(body.notes ?? "").trim().slice(0, 1000);
    if (!(EVENT_MANUAL_PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) {
      return fail("Choisissez un moyen de paiement valide.", 422, "PAYMENT_METHOD_INVALID");
    }
    if (transactionReference.length < 4 || transactionReference.length > 120) {
      return fail("La référence doit contenir entre 4 et 120 caractères.", 422, "PAYMENT_REFERENCE_INVALID");
    }
    if (!proofPath || proofPath.length > 500 || proofPath.includes("..")) {
      return fail("Ajoutez le chemin du justificatif transmis par Jobly.", 422, "PAYMENT_PROOF_REQUIRED");
    }

    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    if (!proofPath.startsWith(user.id + "/")) return fail("Le justificatif ne vous appartient pas.", 403, "PAYMENT_PROOF_FORBIDDEN");
    const bucket = "jobly-payment-proofs";
    const { data: proof, error: proofError } = await sb.storage.from(bucket).download(proofPath);
    if (proofError || !proof) return fail("Justificatif introuvable dans le stockage Jobly.", 422, "PAYMENT_PROOF_NOT_FOUND");
    if (proof.size <= 0 || proof.size > 10 * 1024 * 1024) {
      return fail("Le justificatif doit peser au maximum 10 MB.", 422, "PAYMENT_PROOF_SIZE_INVALID");
    }
    const extension = proofPath.split(".").pop()?.toLowerCase();
    if (!["jpg", "jpeg", "png", "webp", "gif", "pdf"].includes(extension || "")) {
      return fail("Le justificatif doit être une image ou un PDF.", 422, "PAYMENT_PROOF_TYPE_INVALID");
    }

    const target = await paymentContext(paymentId, user.id);
    if ("error" in target) return fail("Paiement introuvable ou cible invalide.", 404, target.error);
    if (target.payment.status !== "PENDING") return fail("Ce paiement n'est plus en attente.", 409, "PAYMENT_NOT_PENDING");
    if (target.submission) return fail("Un justificatif a déjà été transmis pour ce paiement.", 409, "PAYMENT_ALREADY_SUBMITTED");

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const { data: submission, error } = await sb.from("EventManualPaymentSubmission").insert({
      id,
      paymentId,
      eventId: target.event.id,
      userId: user.id,
      paymentMethod,
      transactionReference,
      proofPath,
      notes: notes || null,
      status: "SUBMITTED",
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    }).select("id,status,submittedAt").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({
      submission,
      message: "Justificatif transmis. Votre événement reste en attente jusqu'à la validation par Jobly Finance.",
    }, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Transmission du justificatif impossible.", 500);
  }
}

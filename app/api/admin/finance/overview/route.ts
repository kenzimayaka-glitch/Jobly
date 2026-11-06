import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return { response: NextResponse.json({ message: "Session requise." }, { status: 401 }) };
  const db = adminClient();
  const user = await ensureUser(db, auth);
  if (String(user.role).toUpperCase() !== "ADMIN") return { response: NextResponse.json({ message: "Espace ADMIN requis." }, { status: 403 }) };
  const { data: identity, error } = await db.from("AdminIdentity").select("active")
    .eq("authUserId", auth.id).eq("ownerUserId", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!identity?.active) return { response: NextResponse.json({ message: "Identité ADMIN maître inactive." }, { status: 403 }) };
  return { db };
}

type FinanceRow = Record<string, unknown>;
type FinanceTableSnapshot = { available: boolean; total: number | null; items: FinanceRow[]; reason: string | null };

async function readTable(db: ReturnType<typeof adminClient>, table: string, select: string, orderBy: string): Promise<FinanceTableSnapshot> {
  try {
    const { data, count, error } = await db.from(table).select(select, { count: "exact" })
      .order(orderBy, { ascending: false }).limit(30);
    if (error) return { available: false, total: null, items: [], reason: error.message };
    const rows = (data || []) as unknown as FinanceRow[];
    return { available: true, total: count ?? rows.length, items: rows, reason: null };
  } catch (error) {
    return { available: false, total: null, items: [], reason: error instanceof Error ? error.message : "Source indisponible." };
  }
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireAdmin(request);
    if ("response" in access) return access.response;
    const db = access.db;
    const [payments, manualProofs, smsReceipts, subscriptions, commissions, mobilityTransactions] = await Promise.all([
      readTable(db, "Payment", "id,amount,currency,status,provider,feature,createdAt,paidAt,refundedAt", "createdAt"),
      readTable(db, "EventManualPaymentSubmission", "id,eventId,paymentId,userId,status,paymentMethod,transactionReference,submittedAt,createdAt", "submittedAt"),
      readTable(db, "PaymentSmsReceipt", "id,provider,transactionId,amount,currency,status,processingStatus,occurredAt,receivedAt,matchedPaymentId,fraudFlags", "receivedAt"),
      readTable(db, "Subscription", "id,plan,status,priceAmount,priceCurrency,provider,currentPeriodStart,currentPeriodEnd,createdAt", "createdAt"),
      readTable(db, "Commission", "id,partnerId,event,amount,currency,status,createdAt,paidAt", "createdAt"),
      readTable(db, "MobilityFundingTransaction", "id,allocationId,transactionType,amount,currency,provider,externalReference,status,executedAt,createdAt", "createdAt"),
    ]);
    if (manualProofs.available && manualProofs.items.length) {
      const paymentIds = manualProofs.items.map((row) => typeof row.paymentId === "string" ? row.paymentId : "").filter((id): id is string => id.length > 0);
      if (paymentIds.length) {
        const { data: proofPayments, error: proofPaymentError } = await db.from("Payment")
          .select("id,amount,currency,status,provider,feature").in("id", paymentIds);
        if (proofPaymentError) {
          manualProofs.reason = proofPaymentError.message;
          manualProofs.available = false;
          manualProofs.total = null;
          manualProofs.items = [];
        } else {
          manualProofs.items = manualProofs.items.map((row) => ({
            ...row,
            payment: (proofPayments || []).find((payment: { id: string }) => payment.id === row.paymentId) || null,
          }));
        }
      }
    }
    return NextResponse.json({
      snapshotAt: new Date().toISOString(),
      sources: { payments, manualProofs, smsReceipts, subscriptions, commissions, mobilityTransactions },
    });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Données Finance indisponibles." }, { status: 500 });
  }
}

import { adminClient } from "@/lib/server-auth";
import { ENVIRONMENT_PROFILE } from "@/config/environment-profiles";

export type FallbackChannel = "SMS" | "CALL";

export type DeliveryIntent = {
  applicationId?: string | null;
  recipientUserId?: string | null;
  recipient: string;
  message: string;
  channel: FallbackChannel;
};

export type DeliveryResult = {
  sent: boolean;
  provider: string;
  status: "SENT" | "NOOP_LOGGED" | "FAILED";
};

export async function sendFallbackDelivery(intent: DeliveryIntent): Promise<DeliveryResult> {
  const production = ENVIRONMENT_PROFILE.name === "PRODUCTION";
  const configured =
    intent.channel === "SMS"
      ? Boolean(process.env.SMS_PROVIDER_URL && process.env.SMS_PROVIDER_TOKEN)
      : Boolean(process.env.CALL_PROVIDER_URL && process.env.CALL_PROVIDER_TOKEN);

  if (!production || !configured) {
    const provider = intent.channel === "SMS" ? "noop-sms" : "noop-call";
    await adminClient().from("Recruitment360DeliveryLog").insert({
      applicationId: intent.applicationId ?? null,
      recipientUserId: intent.recipientUserId ?? null,
      channel: intent.channel,
      provider,
      status: "NOOP_LOGGED",
      payload: { recipient: intent.recipient, message: intent.message, reason: production ? "provider_not_configured" : "FREE_TEST" },
    });
    return { sent: false, provider, status: "NOOP_LOGGED" };
  }

  // Provider adapters are deliberately not implemented against a vendor here.
  // This prevents claiming delivery before credentials and a vendor contract exist.
  await adminClient().from("Recruitment360DeliveryLog").insert({
    applicationId: intent.applicationId ?? null,
    recipientUserId: intent.recipientUserId ?? null,
    channel: intent.channel,
    provider: intent.channel === "SMS" ? "configured-but-no-adapter" : "configured-but-no-adapter",
    status: "FAILED",
    payload: { recipient: intent.recipient, message: intent.message, reason: "VENDOR_ADAPTER_REQUIRED" },
  });
  return { sent: false, provider: "configured-but-no-adapter", status: "FAILED" };
}

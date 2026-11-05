import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { inspectCommunityMessage, repeatedViolationAction } from "@/lib/communityEventGuard";

export type CommunityModerationResult = {
  ok: false;
  removed: true;
  action: "NONE" | "WARNING" | "BAN";
  decision: ReturnType<typeof inspectCommunityMessage>;
};

export async function moderateCommunityMessage(input: {
  db: SupabaseClient;
  userId: string;
  communityId: string;
  communityOwnerId: string;
  content: string;
}): Promise<CommunityModerationResult | null> {
  const decision = inspectCommunityMessage(input.content);
  if (!decision.blocked) return null;

  const { data: prior, error: priorError } = await input.db
    .from("JiaEvent")
    .select("id")
    .eq("userId", input.userId)
    .eq("eventType", "COMMUNITY_EVENT_BYPASS")
    .limit(10);

  if (priorError) throw new Error(priorError.message);
  const action = repeatedViolationAction(prior?.length ?? 0);
  const now = new Date().toISOString();

  const { error: eventError } = await input.db.from("JiaEvent").insert({
    id: crypto.randomUUID(),
    userId: input.userId,
    eventType: "COMMUNITY_EVENT_BYPASS",
    path: "/community/" + input.communityId,
    metadata: {
      communityId: input.communityId,
      confidence: decision.confidence,
      reasons: decision.reasons,
      severity: decision.severity,
      action,
    },
  });
  if (eventError) throw new Error(eventError.message);

  const { error: notificationError } = await input.db.from("Notification").insert([
    {
      id: crypto.randomUUID(),
      userId: input.userId,
      type: "COMMUNITY_MODERATION",
      title: "Message retiré",
      body: "Ce message semble organiser ou contourner un rendez-vous événementiel dans Community. Utilisez Jobly Events.",
      link: "/events",
      entityId: input.communityId,
      actionType: "COMMUNITY_MESSAGE_REMOVED",
      actionPayload: { communityId: input.communityId, reasons: decision.reasons },
      locale: "fr",
      channels: { push: false, email: false, inApp: true },
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      userId: input.communityOwnerId,
      type: "COMMUNITY_MODERATION",
      title: "Message Community retiré",
      body: "J’IA a retiré un message qui semblait organiser un rendez-vous événementiel.",
      link: "/communities/" + input.communityId,
      entityId: input.communityId,
      actionType: "COMMUNITY_MESSAGE_REMOVED",
      actionPayload: {
        communityId: input.communityId,
        authorId: input.userId,
        reasons: decision.reasons,
        severity: decision.severity,
      },
      locale: "fr",
      channels: { push: false, email: false, inApp: true },
      createdAt: now,
    },
  ]);
  if (notificationError) throw new Error(notificationError.message);

  if (action === "BAN") {
    const { error: banError } = await input.db
      .from("CommunityMembership")
      .update({ role: "BANNED" })
      .eq("communityId", input.communityId)
      .eq("userId", input.userId);
    if (banError) throw new Error(banError.message);
  }

  return { ok: false, removed: true, action, decision };
}

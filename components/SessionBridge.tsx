"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type BridgeMessage =
  | { type: "JOBLY_SESSION_REQUEST"; requestId: string }
  | { type: "JOBLY_SESSION_RESPONSE"; requestId: string; accessToken: string; refreshToken: string };

export default function SessionBridge() {
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    const channel = new BroadcastChannel("jobly-session-bridge");

    const onMessage = async (event: MessageEvent<BridgeMessage>) => {
      if (event.data?.type !== "JOBLY_SESSION_REQUEST") return;

      try {
        const session = (await getSupabaseClient().auth.getSession()).data.session;
        if (!session?.access_token || !session.refresh_token) return;

        channel.postMessage({
          type: "JOBLY_SESSION_RESPONSE",
          requestId: event.data.requestId,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        } satisfies BridgeMessage);
      } catch {}
    };

    channel.addEventListener("message", onMessage);
    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
    };
  }, []);

  return null;
}

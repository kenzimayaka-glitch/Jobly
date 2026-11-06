"use client";

import { useEffect } from "react";
import { getJoblyDeviceId } from "@/lib/device-identity";
import { getSupabaseClient } from "@/lib/supabase";

type AndroidBridge = {
  postMessage: (message: string) => void;
  onmessage?: ((event: MessageEvent) => void) | null;
};

declare global {
  interface Window {
    joblyAndroid?: AndroidBridge;
  }
}

export default function AndroidAttestationBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined" || !/android/i.test(navigator.userAgent)) return;

    const supabase = getSupabaseClient();
    let running = false;
    let disposed = false;

    const attest = async (accessToken: string) => {
      if (running || disposed) return;
      const bridge = window.joblyAndroid;
      if (!bridge || typeof bridge.postMessage !== "function") return;
      running = true;

      const deviceId = getJoblyDeviceId();
      const headers = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + accessToken,
        "x-jobly-device-id": deviceId,
      };

      try {
        const challengeResponse = await fetch("/api/android/attestation/challenge", {
          method: "POST",
          headers,
          body: JSON.stringify({ deviceId }),
          cache: "no-store",
        });
        const challenge = await challengeResponse.json().catch(() => ({})) as {
          alreadyVerified?: boolean;
          challengeId?: string;
          challenge?: string;
        };
        if (!challengeResponse.ok || challenge.alreadyVerified || !challenge.challengeId || !challenge.challenge) {
          running = false;
          return;
        }

        const previousHandler = bridge.onmessage;
        const timeout = window.setTimeout(() => {
          bridge.onmessage = previousHandler ?? null;
          running = false;
        }, 20_000);

        bridge.onmessage = (event: MessageEvent) => {
          if (previousHandler) previousHandler(event);
          const raw = typeof event.data === "string" ? event.data : "";
          let result: {
            type?: string;
            challengeId?: string;
            certificateChain?: string[];
            error?: string;
          };
          try {
            result = JSON.parse(raw);
          } catch {
            return;
          }
          if (result.type !== "ANDROID_KEY_ATTESTATION_RESULT" || result.challengeId !== challenge.challengeId) return;

          window.clearTimeout(timeout);
          bridge.onmessage = previousHandler ?? null;
          void (async () => {
            try {
              if (!Array.isArray(result.certificateChain) || result.certificateChain.length < 2 || result.error) return;
              await fetch("/api/android/attestation/verify", {
                method: "POST",
                headers,
                body: JSON.stringify({
                  challengeId: challenge.challengeId,
                  deviceId,
                  certificateChain: result.certificateChain,
                }),
                cache: "no-store",
              });
            } finally {
              running = false;
            }
          })();
        };

        bridge.postMessage(JSON.stringify({
          type: "CREATE_ANDROID_KEY_ATTESTATION",
          payload: {
            challengeId: challenge.challengeId,
            challenge: challenge.challenge,
          },
        }));
      } catch {
        running = false;
      }
    };

    const initial = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) await attest(data.session.access_token);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.access_token) {
        void attest(session.access_token);
      }
    });
    void initial();

    return () => {
      disposed = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return null;
}

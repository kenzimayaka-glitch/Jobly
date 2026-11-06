"use client";

import { useEffect } from "react";
import { getJoblyDeviceId } from "@/lib/device-identity";
import { getSupabaseClient } from "@/lib/supabase";

type AndroidBridge = {
  postMessage: (message: string) => void;
  onmessage?: ((event: MessageEvent) => void) | null;
};

type NativeReply = {
  type?: string;
  challengeId?: string;
  certificateChain?: string[];
  signature?: string;
  error?: string;
};

declare global {
  interface Window {
    joblyAndroid?: AndroidBridge;
  }
}

export default function AndroidAttestationBootstrap() {
  useEffect(() => {
    if (typeof window === "undefined" || !/android/i.test(navigator.userAgent)) return;

    const bridge = window.joblyAndroid;
    if (!bridge || typeof bridge.postMessage !== "function") return;

    const supabase = getSupabaseClient();
    const deviceId = getJoblyDeviceId();
    const nativeFetch = window.fetch.bind(window);
    const previousHandler = bridge.onmessage;
    const pending = new Map<string, {
      resolve: (value: NativeReply) => void;
      reject: (error: Error) => void;
      timeout: number;
    }>();
    let disposed = false;
    let registrationStarted = false;

    bridge.onmessage = (event: MessageEvent) => {
      const raw = typeof event.data === "string" ? event.data : "";
      let reply: NativeReply;
      try {
        reply = JSON.parse(raw);
      } catch {
        previousHandler?.(event);
        return;
      }
      const waiting = reply.challengeId ? pending.get(reply.challengeId) : undefined;
      if (!waiting) {
        previousHandler?.(event);
        return;
      }
      window.clearTimeout(waiting.timeout);
      pending.delete(reply.challengeId!);
      waiting.resolve(reply);
    };

    const askNative = (type: string, challengeId: string, payload: Record<string, string>, timeoutMs = 15_000) =>
      new Promise<NativeReply>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          pending.delete(challengeId);
          reject(new Error("ANDROID_NATIVE_BRIDGE_TIMEOUT"));
        }, timeoutMs);
        pending.set(challengeId, { resolve, reject, timeout });
        try {
          bridge.postMessage(JSON.stringify({ type, payload: { challengeId, ...payload } }));
        } catch (error) {
          window.clearTimeout(timeout);
          pending.delete(challengeId);
          reject(error instanceof Error ? error : new Error("ANDROID_NATIVE_BRIDGE_FAILED"));
        }
      });

    // Every authenticated same-origin API request is signed by the attested
    // Android Keystore key. The signature covers method, path, timestamp,
    // one-use server challenge and exact request-body hash.
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      let outgoing: Request;
      try {
        outgoing = new Request(input, init);
      } catch {
        return new Response(JSON.stringify({ message: "Requête Android non signable." }), {
          status: 403,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      }

      const url = new URL(outgoing.url);
      if (url.origin !== window.location.origin ||
          !url.pathname.startsWith("/api/") ||
          url.pathname.startsWith("/api/android/attestation/") ||
          outgoing.method === "OPTIONS") {
        return nativeFetch(input, init);
      }

      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = outgoing.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ||
          data.session?.access_token;
        if (!accessToken) return nativeFetch(input, init);

        const timestamp = String(Date.now());
        const path = url.pathname + url.search;
        const authHeaders = {
          "Content-Type": "application/json",
          Authorization: "Bearer " + accessToken,
          "x-jobly-device-id": deviceId,
        };

        const challengeResponse = await nativeFetch("/api/android/attestation/assertion", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            deviceId,
            method: outgoing.method,
            path,
            timestamp,
          }),
          cache: "no-store",
        });
        if (!challengeResponse.ok) return challengeResponse;

        const challenge = await challengeResponse.json() as { challengeId?: string; payload?: string };
        if (!challenge.challengeId || !challenge.payload) {
          return new Response(JSON.stringify({ message: "Défi d'intégrité Android invalide." }), {
            status: 403,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        }

        const signed = await askNative("SIGN_ANDROID_API_REQUEST", challenge.challengeId, {
          payload: challenge.payload,
        }, 8_000);
        if (!signed.signature || signed.error) {
          return new Response(JSON.stringify({ message: "Signature matérielle Android indisponible." }), {
            status: 403,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
          });
        }

        const headers = new Headers(outgoing.headers);
        headers.set("Authorization", "Bearer " + accessToken);
        headers.set("x-jobly-device-id", deviceId);
        headers.set("x-jobly-attestation-challenge", challenge.challengeId);
        headers.set("x-jobly-attestation-timestamp", timestamp);
        headers.set("x-jobly-attestation-signature", signed.signature);
        return nativeFetch(new Request(outgoing, { headers }));
      } catch {
        return new Response(JSON.stringify({ message: "La preuve cryptographique de cet appareil n'a pas pu être produite." }), {
          status: 403,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      }
    };

    const register = async (accessToken: string) => {
      if (registrationStarted || disposed) return;
      registrationStarted = true;
      const headers = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + accessToken,
        "x-jobly-device-id": deviceId,
      };
      let registered = false;
      try {
        const challengeResponse = await nativeFetch("/api/android/attestation/challenge", {
          method: "POST",
          headers,
          body: JSON.stringify({ deviceId }),
          cache: "no-store",
        });
        if (!challengeResponse.ok) return;
        const challenge = await challengeResponse.json() as { challengeId?: string; challenge?: string };
        if (!challenge.challengeId || !challenge.challenge) return;

        const result = await askNative("CREATE_ANDROID_KEY_ATTESTATION", challenge.challengeId, {
          challenge: challenge.challenge,
        }, 20_000);
        if (!Array.isArray(result.certificateChain) || result.certificateChain.length < 2 || result.error) return;

        const verifyResponse = await nativeFetch("/api/android/attestation/verify", {
          method: "POST",
          headers,
          body: JSON.stringify({
            challengeId: challenge.challengeId,
            deviceId,
            certificateChain: result.certificateChain,
          }),
          cache: "no-store",
        });
        registered = verifyResponse.ok;
      } catch {
        // Fail closed: authenticated native API calls remain blocked until
        // the server has verified and stored the hardware-backed attestation.
      } finally {
        registrationStarted = registered;
      }
    };

    const initial = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) await register(data.session.access_token);
    };
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        registrationStarted = false;
      } else if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.access_token) {
        void register(session.access_token);
      }
    });
    void initial();

    return () => {
      disposed = true;
      authListener.subscription.unsubscribe();
      if (window.fetch !== nativeFetch) window.fetch = nativeFetch;
      for (const waiting of pending.values()) {
        window.clearTimeout(waiting.timeout);
        waiting.reject(new Error("ANDROID_ATTESTATION_COMPONENT_UNMOUNTED"));
      }
      pending.clear();
      bridge.onmessage = previousHandler ?? null;
    };
  }, []);

  return null;
}

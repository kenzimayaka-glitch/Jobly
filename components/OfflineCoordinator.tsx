"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import {
  countPendingOfflineOperations,
  getOfflineUserId,
  getPendingOfflineOperations,
  removePendingOfflineOperations,
} from "@/lib/offline-store";

type Connectivity = "online" | "offline" | "syncing" | "attention";

export default function OfflineCoordinator() {
  const [connectivity, setConnectivity] = useState<Connectivity>("online");
  const [pendingCount, setPendingCount] = useState(0);
  const [message, setMessage] = useState("");

  const refreshCount = useCallback(async () => {
    try {
      setPendingCount(await countPendingOfflineOperations());
    } catch {
      setPendingCount(0);
    }
  }, []);

  const signOutRevokedSession = useCallback(async () => {
    try {
      await getSupabaseClient().auth.signOut({ scope: "local" });
    } catch {}
    window.dispatchEvent(new CustomEvent("jobly:device-session-revoked"));
    setConnectivity("attention");
    setMessage("Cette connexion a été remplacée par une connexion plus récente. Reconnectez-vous pour continuer.");
  }, []);

  const synchronize = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.onLine) {
      setConnectivity("offline");
      await refreshCount();
      return;
    }
    const userId = getOfflineUserId();
    if (!userId) {
      setConnectivity("online");
      setPendingCount(0);
      return;
    }

    try {
      const { data } = await getSupabaseClient().auth.getSession();
      if (!data.session?.access_token) {
        setConnectivity("offline");
        await refreshCount();
        return;
      }
      const operations = await getPendingOfflineOperations(userId);
      if (!operations.length) {
        setConnectivity("online");
        setPendingCount(0);
        return;
      }

      setConnectivity("syncing");
      setMessage("");
      const response = await fetch("/api/offline/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ userId, operations }),
        cache: "no-store",
      });
      if (response.status === 401) {
        await signOutRevokedSession();
        return;
      }
      const payload = await response.json().catch(() => ({})) as { applied?: string[]; failed?: { id: string; message: string }[] };
      if (!response.ok) throw new Error((payload as { message?: string }).message || "Synchronisation impossible.");
      const applied = Array.isArray(payload.applied) ? payload.applied : [];
      await removePendingOfflineOperations(userId, applied);
      const remaining = await countPendingOfflineOperations(userId);
      setPendingCount(remaining);
      if (remaining > 0) {
        setConnectivity("attention");
        setMessage("Certaines modifications nécessitent une vérification. Elles restent enregistrées sur cet appareil.");
      } else {
        setConnectivity("online");
        setMessage("");
      }
    } catch {
      setConnectivity(navigator.onLine ? "attention" : "offline");
      await refreshCount();
    }
  }, [refreshCount, signOutRevokedSession]);

  const validateDeviceSession = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.onLine) return;
    try {
      const { data } = await getSupabaseClient().auth.getSession();
      if (!data.session?.access_token) return;
      const response = await fetch("/api/device-sessions", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        cache: "no-store",
      });
      if (response.status === 401) await signOutRevokedSession();
    } catch {
      // Network interruptions do not invalidate a locally cached offline workspace.
    }
  }, [signOutRevokedSession]);

  useEffect(() => {
    const onOnline = () => { setConnectivity("syncing"); void validateDeviceSession().finally(() => void synchronize()); };
    const onOffline = () => { setConnectivity("offline"); void refreshCount(); };
    const onFocus = () => {
      if (navigator.onLine) void validateDeviceSession().finally(() => void synchronize());
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void validateDeviceSession().finally(() => void synchronize());
      }
    };

    const auth = getSupabaseClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setConnectivity(navigator.onLine ? "online" : "offline");
        void refreshCount();
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (navigator.onLine) void validateDeviceSession().finally(() => void synchronize());
      }
    });

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    void refreshCount();
    if (navigator.onLine) void validateDeviceSession().finally(() => void synchronize());
    const interval = window.setInterval(() => {
      if (navigator.onLine) void validateDeviceSession().finally(() => void synchronize());
    }, 60_000);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      auth.data.subscription.unsubscribe();
    };
  }, [refreshCount, synchronize, validateDeviceSession]);

  if (connectivity === "online" && pendingCount === 0 && !message) return null;

  const label = connectivity === "offline"
    ? "Mode hors connexion"
    : connectivity === "syncing"
      ? "Synchronisation Jobly…"
      : connectivity === "attention"
        ? "Synchronisation à vérifier"
        : "Jobly est en ligne";

  return (
    <div role="status" aria-live="polite" className="fixed inset-x-0 top-0 z-[100] px-2 pt-[env(safe-area-inset-top)] pointer-events-none">
      <div className={`mx-auto mt-2 flex max-w-3xl items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-xs font-semibold shadow-lg backdrop-blur-xl pointer-events-auto ${connectivity === "offline" ? "border-amber-300 bg-amber-50/95 text-amber-950" : connectivity === "attention" ? "border-orange-300 bg-orange-50/95 text-orange-950" : "border-blue-200 bg-white/95 text-[#0A1931]"}`}>
        <span className="min-w-0">
          <span className="block">{label}</span>
          {message ? <span className="block mt-0.5 font-medium opacity-80">{message}</span> : null}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {connectivity === "offline" || pendingCount > 0 ? <a href="/offline" className="rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-extrabold">Ouvrir</a> : null}
          {pendingCount > 0 ? <span className="rounded-full bg-black/5 px-2.5 py-1">{pendingCount} en attente</span> : null}
        </div>
      </div>
    </div>
  );
}

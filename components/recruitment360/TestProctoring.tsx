"use client";

import { useEffect, useRef, useState } from "react";
import { drainOfflineEvents, enqueueOfflineEvent, type OfflineEvent } from "@/lib/recruitment360/offline-queue";

type Props = {
  sessionId: string;
  consentCamera: boolean;
  onStatus?: (status: { online: boolean; fullscreen: boolean; camera: string }) => void;
};

export default function TestProctoring({ sessionId, consentCamera, onStatus }: Props) {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [fullscreen, setFullscreen] = useState(false);
  const [camera, setCamera] = useState("not-requested");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function send(events: OfflineEvent[]) {
    if (!events.length) return;
    if (!navigator.onLine) {
      events.forEach((e) => enqueueOfflineEvent(sessionId, e));
      return;
    }
    try {
      const r = await fetch("/api/recruitment360/tests/proctoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, events }),
        keepalive: true,
      });
      if (!r.ok) throw new Error("sync_failed");
      const queued = drainOfflineEvents(sessionId);
      if (queued.length) await send(queued);
    } catch {
      events.forEach((e) => enqueueOfflineEvent(sessionId, e));
    }
  }

  function emit(event: string, metadata: Record<string, unknown> = {}) {
    const item = { event, metadata, occurredAt: new Date().toISOString() };
    void send([item]);
  }

  useEffect(() => {
    if (!sessionId) return;
    const visibility = () => {
      const hidden = document.visibilityState !== "visible";
      setOnline(navigator.onLine);
      if (hidden) emit("TAB_HIDDEN");
      else emit("TAB_VISIBLE");
    };
    const blur = () => emit("WINDOW_BLUR");
    const full = () => {
      const active = !!document.fullscreenElement;
      setFullscreen(active);
      if (!active) emit("FULLSCREEN_EXIT");
    };
    const paste = () => emit("PASTE");
    const onlineHandler = () => {
      setOnline(true);
      void send(drainOfflineEvents(sessionId));
      emit("NETWORK_RESTORED");
    };
    const offlineHandler = () => {
      setOnline(false);
      emit("NETWORK_LOST");
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    document.addEventListener("fullscreenchange", full);
    window.addEventListener("paste", paste);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    void send(drainOfflineEvents(sessionId));
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      document.removeEventListener("fullscreenchange", full);
      window.removeEventListener("paste", paste);
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!consentCamera) return;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCamera("unavailable");
          emit("CAMERA_UNAVAILABLE");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setCamera("active");
        emit("CAMERA_ACTIVE");
      } catch {
        setCamera("denied");
        emit("CAMERA_DENIED");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [consentCamera]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!navigator.onLine) return;
      const started = performance.now();
      fetch("/api/health", { cache: "no-store" })
        .then(() => {
          const rtt = Math.round(performance.now() - started);
          if (rtt > 1500) emit("NETWORK_DEGRADED", { rttMs: rtt });
        })
        .catch(() => emit("NETWORK_DEGRADED", { rttMs: null }));
    }, 15000);
    return () => window.clearInterval(id);
  }, [sessionId]);

  useEffect(() => {
    onStatus?.({ online, fullscreen, camera });
  }, [online, fullscreen, camera, onStatus]);

  return (
    <div className="rounded-2xl border p-3 text-xs">
      <div className="flex flex-wrap gap-3">
        <span>Réseau : {online ? "connecté" : "hors ligne — sauvegarde locale active"}</span>
        <span>Plein écran : {fullscreen ? "actif" : "à activer"}</span>
        {consentCamera && <span>Caméra : {camera}</span>}
      </div>
      {consentCamera && (
        <video ref={videoRef} muted playsInline className="mt-3 aspect-video w-full rounded-xl object-cover" aria-label="Prévisualisation caméra locale" />
      )}
      <p className="mt-2 opacity-70">
        Aucune vidéo caméra n'est envoyée par ce composant. Les événements techniques uniquement sont transmis au serveur.
      </p>
    </div>
  );
}

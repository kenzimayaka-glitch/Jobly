"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

const SESSION_KEY = "jobly_jia_session";

function sessionId() {
  if (typeof window === "undefined") return "";
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

export default function JiaObserver() {
  const pathname = usePathname();
  const startedAt = useRef(Date.now());
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSupabaseClient().auth.getSession().then(async ({ data }) => {
      if (cancelled || !data.session) return;
      const token = data.session.access_token;
      const sid = sessionId();
      const send = (eventType: string, metadata: Record<string, unknown> = {}, durationMs?: number) => {
        const body = JSON.stringify({ eventType, sessionId: sid, path: pathname, durationMs, metadata });
        void fetch("/api/jia/events", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body,
          keepalive: true,
        }).catch(() => {});
      };

      if (!sessionStorage.getItem("jobly_jia_session_started")) {
        sessionStorage.setItem("jobly_jia_session_started", "1");
        send("SESSION_START", { source: "web" });
      }

      if (lastPath.current !== pathname) {
        lastPath.current = pathname;
        startedAt.current = Date.now();
        send("PAGE_VIEW", { source: "navigation" });
      }

      const onVisibility = () => {
        if (document.visibilityState === "hidden") {
          send("SESSION_END", { reason: "visibility_hidden" }, Date.now() - startedAt.current);
        }
      };
      document.addEventListener("visibilitychange", onVisibility);
      return () => document.removeEventListener("visibilitychange", onVisibility);
    });
    return () => { cancelled = true; };
  }, [pathname]);

  return null;
}

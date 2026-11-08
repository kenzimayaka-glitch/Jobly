"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import JoblyToast, { unlockJoblyToastAudio } from "@/components/JoblyToast";
import {
  getDoualaDayKey,
  isWithinLiveWinsWindow,
  LIVE_WINS_DAILY_CAP,
  nextLiveWinsAt,
  nextLiveWinsOnFollowingDay,
} from "@/lib/jobly-live-wins-schedule";

type LiveWinsEvent = { eventKey: string; occurredAt: number };
type LiveWinsToast = { title: string; message: string };
type StoredSchedule = {
  version: 1;
  nextAt: number;
  dayKey: string;
  shownToday: number;
  seenEventKeys: string[];
  claimUntil: number;
};

const MAX_SEEN_EVENTS = 100;
const CLAIM_WINDOW_MS = 60 * 1000;
const HIDDEN_RECHECK_MS = 60 * 1000;

function scheduleStorageKey(userId: string) {
  return "jobly:live-wins:schedule:" + userId;
}

function soundStorageKey(userId: string) {
  return "jobly:live-wins:sound:" + userId;
}

function isStoredSchedule(value: unknown): value is StoredSchedule {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<StoredSchedule>;
  return state.version === 1 &&
    Number.isFinite(state.nextAt) &&
    typeof state.dayKey === "string" &&
    Number.isFinite(state.shownToday) &&
    Array.isArray(state.seenEventKeys) &&
    Number.isFinite(state.claimUntil);
}

function buildInitialSchedule(now: number): StoredSchedule {
  return {
    version: 1,
    nextAt: nextLiveWinsAt(now),
    dayKey: getDoualaDayKey(now),
    shownToday: 0,
    seenEventKeys: [],
    claimUntil: 0,
  };
}

export default function JoblyLiveWins() {
  const [userId, setUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<LiveWinsToast | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const unlock = () => unlockJoblyToastAudio();
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | null = null;

    try {
      const supabase = getSupabaseClient();
      void supabase.auth.getSession().then(({ data }) => {
        if (!disposed) setUserId(data.session?.user?.id || null);
      }).catch(() => {
        if (!disposed) setUserId(null);
      });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!disposed) {
          setToast(null);
          setUserId(session?.user?.id || null);
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      setUserId(null);
    }

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setToast(null);
      setSoundEnabled(true);
      return;
    }

    let disposed = false;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let memorySchedule: StoredSchedule | null = null;
    const key = scheduleStorageKey(userId);
    const soundKey = soundStorageKey(userId);

    try {
      setSoundEnabled(window.localStorage.getItem(soundKey) !== "0");
    } catch {
      setSoundEnabled(true);
    }

    const readSchedule = (): StoredSchedule | null => {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isStoredSchedule(parsed)) {
            memorySchedule = parsed;
            return parsed;
          }
        }
      } catch {
        // Private browsing may disable persistent storage; keep an in-memory fallback.
      }
      return memorySchedule;
    };

    const writeSchedule = (state: StoredSchedule) => {
      memorySchedule = state;
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // The schedule remains valid for this account during the current page session.
      }
    };

    const scheduleCheck = (delayOverride?: number) => {
      if (disposed) return;
      if (timer) clearTimeout(timer);
      const state = readSchedule() || buildInitialSchedule(Date.now());
      writeSchedule(state);
      const delay = delayOverride ?? Math.max(0, state.nextAt - Date.now());
      timer = setTimeout(() => void processSchedule(), Math.min(delay, 2147483000));
    };

    const processSchedule = async () => {
      if (disposed || inFlight) return;

      const now = Date.now();
      let state = readSchedule() || buildInitialSchedule(now);
      const today = getDoualaDayKey(now);

      if (state.dayKey !== today) {
        state = { ...state, dayKey: today, shownToday: 0 };
      }

      if (state.claimUntil > now) {
        writeSchedule(state);
        scheduleCheck(Math.max(1000, state.claimUntil - now + 50));
        return;
      }

      if (state.nextAt > now) {
        writeSchedule(state);
        scheduleCheck();
        return;
      }

      if (document.visibilityState !== "visible") {
        writeSchedule(state);
        scheduleCheck(HIDDEN_RECHECK_MS);
        return;
      }

      if (!isWithinLiveWinsWindow(now)) {
        state.nextAt = nextLiveWinsAt(now);
        state.claimUntil = 0;
        writeSchedule(state);
        scheduleCheck();
        return;
      }

      if (state.shownToday >= LIVE_WINS_DAILY_CAP) {
        state.nextAt = nextLiveWinsOnFollowingDay(now);
        state.claimUntil = 0;
        writeSchedule(state);
        scheduleCheck();
        return;
      }

      // A short lease prevents two tabs from displaying the same event at the same time.
      state.claimUntil = now + CLAIM_WINDOW_MS;
      writeSchedule(state);
      inFlight = true;

      try {
        const { data: sessionData } = await getSupabaseClient().auth.getSession();
        const session = sessionData.session;
        if (!session || session.user.id !== userId) return;

        const response = await fetch("/api/live-wins", {
          method: "GET",
          headers: { Authorization: "Bearer " + session.access_token },
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Live Wins is unavailable.");

        const payload = await response.json() as { role?: string; events?: LiveWinsEvent[] };
        const role = String(payload.role || "").toUpperCase();
        const seen = new Set(state.seenEventKeys);
        const candidates = Array.isArray(payload.events)
          ? payload.events.filter((event) =>
              typeof event?.eventKey === "string" &&
              Number.isFinite(event.occurredAt) &&
              !seen.has(event.eventKey)
            )
          : [];

        if ((role === "TALENT" || role === "RECRUITER") &&
            candidates.length > 0 && document.visibilityState === "visible") {
          const event = candidates[Math.floor(Math.random() * candidates.length)];
          const isFresh = Date.now() - event.occurredAt <= 24 * 60 * 60 * 1000;
          const message = role === "TALENT"
            ? isFresh
              ? "1 talent vient de recevoir une proposition d’embauche grâce à Jobly."
              : "1 talent a récemment reçu une proposition d’embauche grâce à Jobly."
            : isFresh
              ? "1 recruteur vient de faire une proposition d’embauche à un talent grâce à Jobly."
              : "1 recruteur a récemment fait une proposition d’embauche à un talent grâce à Jobly.";

          setToast({ title: "Une réussite Jobly", message });
          state.shownToday += 1;
          state.seenEventKeys = [...state.seenEventKeys, event.eventKey].slice(-MAX_SEEN_EVENTS);
        }

        const completedAt = Date.now();
        state.dayKey = getDoualaDayKey(completedAt);
        state.nextAt = state.shownToday >= LIVE_WINS_DAILY_CAP
          ? nextLiveWinsOnFollowingDay(completedAt)
          : nextLiveWinsAt(completedAt);
      } catch {
        // No synthetic activity is ever substituted; retry later using the account's random schedule.
        state.nextAt = nextLiveWinsAt(Date.now());
      } finally {
        state.claimUntil = 0;
        writeSchedule(state);
        inFlight = false;
        if (!disposed) scheduleCheck();
      }
    };

    const initial = readSchedule() || buildInitialSchedule(Date.now());
    writeSchedule(initial);
    scheduleCheck();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        const state = readSchedule();
        if (state && state.nextAt <= Date.now()) {
          if (timer) clearTimeout(timer);
          void processSchedule();
        }
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === key) {
        const state = readSchedule();
        if (state) scheduleCheck();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("storage", onStorage);

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, [userId]);

  const closeToast = useCallback(() => setToast(null), []);
  const toggleSound = useCallback(() => {
    if (!userId) return;
    const next = !soundEnabled;
    if (next) unlockJoblyToastAudio();
    setSoundEnabled(next);
    try {
      window.localStorage.setItem(soundStorageKey(userId), next ? "1" : "0");
    } catch {
      // The preference remains active until this page session ends.
    }
  }, [soundEnabled, userId]);

  if (!toast) return null;

  return (
    <JoblyToast
      title={toast.title}
      message={toast.message}
      variant="success"
      duration={2500}
      instantMessage
      celebration
      sound="pop"
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      onClose={closeToast}
    />
  );
}

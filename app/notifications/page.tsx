"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../../components/PageHeader";
import DecorativeBackground from "../../components/DecorativeBackground";
import { getSupabaseClient } from "../../lib/supabase";

type NotificationItem = {
  id: string;
  type?: string | null;
  title?: string | null;
  body?: string | null;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
  applicationId?: string | null;
  actionType?: string | null;
  actionPayload?: Record<string, unknown> | null;
  openedAt?: string | null;
  recruiterSeenAt?: string | null;
};

const copy = {
  fr: {
    title: "Notifications",
    loading: "Chargement…",
    empty: "Aucune notification pour l'instant",
    emptyBody: "Vous serez prévenu ici dès qu'il y aura du nouveau sur vos candidatures, vos offres ou votre compte.",
    error: "Impossible de charger les notifications.",
    action: "Ouvrir",
    unread: "Non lue",
    read: "Lue",
    received: "Notification reçue",
    markError: "Impossible d'enregistrer l'ouverture.",
    back: "Retour",
  },
  en: {
    title: "Notifications",
    loading: "Loading…",
    empty: "No notifications yet",
    emptyBody: "You will be notified here when there is something new about your applications, jobs or account.",
    error: "Unable to load notifications.",
    action: "Open",
    unread: "Unread",
    read: "Read",
    received: "Notification received",
    markError: "Unable to record the opening.",
    back: "Back",
  },
} as const;

function locale() {
  if (typeof navigator === "undefined") return "fr" as const;
  return navigator.language.toLowerCase().startsWith("en") ? "en" as const : "fr" as const;
}

function formatDate(value: string, lang: "fr" | "en") {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function NotificationsPage() {
  const router = useRouter();
  const [lang] = useState<"fr" | "en">(locale);
  const t = copy[lang];
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [opening, setOpening] = useState<string | null>(null);

  const unreadCount = useMemo(() => items.filter((item) => !item.readAt).length, [items]);

  async function authHeaders() {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  }

  async function load() {
    setStatus("loading");
    setError("");
    try {
      const headers = await authHeaders();
      const response = await fetch("/api/notifications", { headers, cache: "no-store" });
      if (!response.ok) throw new Error(t.error);
      const data = await response.json();
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : t.error);
      setStatus("error");
    }
  }

  async function openNotification(item: NotificationItem) {
    if (opening) return;
    setOpening(item.id);
    try {
      const headers = await authHeaders();
      const response = await fetch(`/api/notifications/${item.id}/open`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error(t.markError);

      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, readAt: entry.readAt || new Date().toISOString(), openedAt: entry.openedAt || new Date().toISOString() }
            : entry
        )
      );

      if (item.link) router.push(item.link);
      else if (item.actionPayload?.href && typeof item.actionPayload.href === "string") router.push(item.actionPayload.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.markError);
    } finally {
      setOpening(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#F7FAFF] pb-16 text-navy">
      <DecorativeBackground />
      <div className="relative z-10">
        <PageHeader label={t.title} initial="J" onBack={() => router.back()} />

        <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-jobly-gray">{t.received}</p>
              <h1 className="mt-1 text-2xl font-black text-navy">
                {t.title}{unreadCount > 0 ? ` · ${unreadCount}` : ""}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-navy shadow-sm"
            >
              {lang === "fr" ? "Actualiser" : "Refresh"}
            </button>
          </div>

          {status === "loading" && (
            <div className="rounded-[24px] border border-slate-100 bg-white px-4 py-12 text-center shadow-[0_16px_50px_rgba(22,37,74,0.08)]">
              <p className="text-sm font-semibold text-jobly-gray">{t.loading}</p>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-[24px] border border-red-100 bg-white px-4 py-10 text-center shadow-[0_16px_50px_rgba(22,37,74,0.08)]">
              <p className="font-bold text-navy">{error || t.error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-4 rounded-xl bg-[#FFD60A] px-5 py-3 text-sm font-black text-navy"
              >
                {lang === "fr" ? "Réessayer" : "Try again"}
              </button>
            </div>
          )}

          {status === "ready" && items.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-[24px] border border-slate-100 bg-white px-4 py-12 text-center shadow-[0_16px_50px_rgba(22,37,74,0.10)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-jobly-blue text-xl text-white" aria-hidden="true">🔔</span>
              <p className="font-heading text-base font-extrabold text-navy">{t.empty}</p>
              <p className="max-w-xs text-sm text-jobly-gray">{t.emptyBody}</p>
            </div>
          )}

          {status === "ready" && items.length > 0 && (
            <ul className="space-y-3">
              {items.map((item) => {
                const unread = !item.readAt;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void openNotification(item)}
                      disabled={opening === item.id}
                      className={`w-full rounded-[22px] border bg-white p-4 text-left shadow-[0_12px_40px_rgba(22,37,74,0.07)] transition hover:-translate-y-0.5 disabled:opacity-60 ${unread ? "border-[#FFD60A] ring-1 ring-[#FFD60A]/30" : "border-slate-100"}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${unread ? "bg-[#FFD60A]" : "bg-slate-100"}`} aria-hidden="true">
                          🔔
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-extrabold text-navy">{item.title || t.received}</p>
                            <span className="shrink-0 text-[11px] font-bold text-jobly-gray">
                              {unread ? t.unread : t.read}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-jobly-gray">{item.body || ""}</p>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="text-[11px] text-jobly-gray">{formatDate(item.createdAt, lang)}</span>
                            <span className="rounded-full bg-[#FFD60A] px-3 py-1 text-xs font-black text-navy">
                              {item.actionType ? t.action : (lang === "fr" ? "Détails" : "Details")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

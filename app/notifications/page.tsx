"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../../components/PageHeader";
import { getSupabaseClient } from "@/lib/supabase";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
  actionType: string | null;
  actionPayload: Record<string, unknown> | null;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [notificationsDisabled, setNotificationsDisabled] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  );

  const load = useCallback(async (accessToken: string, cancelled?: () => boolean) => {
    setError("");
    const response = await fetch("/api/notifications?limit=50", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || body.error || "Notifications indisponibles.");
    if (cancelled?.()) return;
    setNotificationsDisabled(body.disabled === true);
    setNotifications(Array.isArray(body.notifications) ? body.notifications : []);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const session = await getSupabaseClient().auth.getSession();
        const accessToken = session.data.session?.access_token;
        if (!accessToken) {
          router.replace("/");
          return;
        }
        if (!active) return;
        setToken(accessToken);
        await load(accessToken, () => !active);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Impossible de charger les notifications.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [load, router]);

  async function markRead(id: string) {
    if (!token || savingId) return false;
    setSavingId(id);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || body.error || "Impossible de marquer la notification comme lue.");
      setNotifications((items) => items.map((item) =>
        item.id === id && !item.readAt ? { ...item, readAt: body.readAt || new Date().toISOString() } : item,
      ));
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Mise à jour impossible.");
      return false;
    } finally {
      setSavingId(null);
    }
  }

  async function markAllRead() {
    if (!token || markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || body.error || "Impossible de marquer les notifications comme lues.");
      const readAt = body.readAt || new Date().toISOString();
      setNotifications((items) => items.map((item) => item.readAt ? item : { ...item, readAt }));
      setNotice("Toutes les notifications sont marquées comme lues.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Mise à jour impossible.");
    } finally {
      setMarkingAll(false);
    }
  }

  async function openNotification(notification: NotificationItem) {
    const marked = notification.readAt ? true : await markRead(notification.id);
    if (!marked) return;
    const destination = typeof notification.link === "string" ? notification.link.trim() : "";
    if (destination.startsWith("/") && !destination.startsWith("//")) router.push(destination);
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#F7FAFF] pb-16 text-navy">
      <div className="relative z-10">
        <PageHeader label="Notifications" initial="J" theme="talent" role="talent" onBack={() => router.back()} />

        <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-extrabold text-navy">Mes notifications</h1>
              <p className="mt-1 text-sm text-jobly-gray">
                {unreadCount > 0
                  ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
                  : "Tu es à jour."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={!unreadCount || markingAll || !token}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-jobly-blue disabled:opacity-40"
            >
              {markingAll ? "Mise à jour…" : "Tout marquer comme lu"}
            </button>
          </div>

          {error && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
              <span>{error}</span>
              <button type="button" onClick={() => token && void load(token)} className="shrink-0 font-extrabold underline">Réessayer</button>
            </div>
          )}
          {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">{notice}</p>}

          {loading ? (
            <div className="mt-6 rounded-[24px] border border-slate-100 bg-white px-4 py-12 text-center text-sm font-bold text-jobly-gray">
              Chargement de tes notifications…
            </div>
          ) : notifications.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-[24px] border border-slate-100 bg-white px-4 py-12 text-center shadow-[0_16px_50px_rgba(22,37,74,0.08)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canari-blue-soft text-xl text-canari-blue" aria-hidden="true">🔔</span>
              <p className="font-heading text-base font-extrabold text-navy">{notificationsDisabled ? "Notifications désactivées" : "Aucune notification pour l'instant"}</p>
              <p className="max-w-xs text-sm text-jobly-gray">{notificationsDisabled ? "Tu peux réactiver les notifications depuis Paramètres du compte." : "Tu seras prévenu ici dès qu'il y aura du nouveau sur tes candidatures, tes offres ou ton compte."}</p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {notifications.map((notification) => {
                const unread = !notification.readAt;
                const saving = savingId === notification.id;
                return (
                  <article key={notification.id} className={`rounded-[22px] border bg-white p-4 shadow-[0_8px_24px_rgba(22,37,74,0.05)] ${unread ? "border-canari-blue/30" : "border-slate-100"}`}>
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm ${unread ? "bg-canari-blue-soft text-canari-blue" : "bg-slate-100 text-slate-500"}`} aria-hidden="true">🔔</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-extrabold text-navy">{notification.title}</h2>
                          {unread && <span className="rounded-full bg-canari px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-navy">Nouveau</span>}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-jobly-gray">{notification.body}</p>
                        <p className="mt-2 text-[10px] font-semibold text-slate-400">
                          {new Date(notification.createdAt).toLocaleString("fr-FR")}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {notification.link?.startsWith("/") && !notification.link.startsWith("//") && (
                            <button type="button" onClick={() => void openNotification(notification)} disabled={saving} className="rounded-xl bg-jobly-blue px-3 py-2 text-[11px] font-extrabold text-white disabled:opacity-50">
                              Ouvrir →
                            </button>
                          )}
                          {unread && (
                            <button type="button" onClick={() => void markRead(notification.id)} disabled={saving} className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-extrabold text-jobly-blue disabled:opacity-50">
                              {saving ? "Mise à jour…" : "Marquer comme lue"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

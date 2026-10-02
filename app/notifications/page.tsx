"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../../components/PageHeader";
import DecorativeBackground from "../../components/DecorativeBackground";
import { getSupabaseClient } from "@/lib/supabase";

type Notification = {
  id: string;
  type?: string | null;
  title: string;
  body?: string | null;
  link?: string | null;
  entityId?: string | null;
  readAt?: string | null;
  createdAt: string;
  actionType?: string | null;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);

  const load = useCallback(async (accessToken: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/notifications?limit=50", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Notifications indisponibles.");
      setItems(Array.isArray(payload.notifications) ? payload.notifications : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Notifications indisponibles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!active) return;
      const session = data.session;
      if (!session) {
        router.replace("/");
        return;
      }
      setToken(session.access_token);
      void load(session.access_token);
    });
    return () => { active = false; };
  }, [router, load]);

  function openNotification(item: Notification) {
    const destination = typeof item.link === "string" && item.link.startsWith("/") && !item.link.startsWith("//")
      ? item.link
      : null;
    if (destination) router.push(destination);
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#F7FAFF] pb-16 text-navy">
      <DecorativeBackground />
      <div className="relative z-10">
        <PageHeader label="Notifications" initial="J" onBack={() => router.back()} />

        <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-6">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-extrabold text-navy">Vos notifications</h1>
              <p className="mt-1 text-sm text-jobly-gray">Suivez les événements liés à votre parcours Jobly.</p>
            </div>
            <button type="button" onClick={() => token && void load(token)} disabled={loading} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-jobly-blue disabled:opacity-50">
              {loading ? "Actualisation…" : "Actualiser"}
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-[24px] border border-slate-100 bg-white px-4 py-12 text-center text-sm text-slate-500 shadow-sm">
              Chargement…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[24px] border border-slate-100 bg-white px-4 py-12 text-center shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-jobly-blue text-xl text-white" aria-hidden="true">🔔</span>
              <p className="font-heading text-base font-extrabold text-navy">Aucune notification pour l'instant</p>
              <p className="max-w-sm text-sm text-jobly-gray">Vous serez prévenu ici dès qu'il y aura du nouveau sur vos candidatures, vos offres ou votre compte.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => {
                const clickable = Boolean(item.link && item.link.startsWith("/") && !item.link.startsWith("//"));
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openNotification(item)}
                    disabled={!clickable}
                    className="flex w-full items-start gap-3 rounded-[20px] border border-slate-100 bg-white p-4 text-left shadow-sm disabled:cursor-default"
                  >
                    <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.readAt ? "bg-slate-100" : "bg-[#FFF3B8]"}`} aria-hidden="true">🔔</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <strong className="text-sm font-extrabold text-navy">{item.title}</strong>
                        {!item.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-jobly-blue" aria-label="Non lue" />}
                      </span>
                      {item.body && <span className="mt-1 block text-sm leading-5 text-jobly-gray">{item.body}</span>}
                      <span className="mt-2 block text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString("fr-FR")}{clickable ? " · Ouvrir →" : ""}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

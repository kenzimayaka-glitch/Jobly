"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../../components/PageHeader";
import DecorativeBackground from "../../components/DecorativeBackground";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/notifications", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data.notifications) ? data.notifications : [];
      })
      .then((notifications) => {
        if (active) setItems(notifications);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#F7FAFF] pb-16 text-navy">
      <DecorativeBackground />
      <div className="relative z-10">
        <PageHeader label="Notifications" initial="J" onBack={() => router.back()} />

        <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-6">
          {loading ? (
            <div className="rounded-[24px] border border-slate-100 bg-white px-4 py-12 text-center text-sm text-jobly-gray shadow-[0_16px_50px_rgba(22,37,74,0.10)]">
              Chargement…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-[24px] border border-slate-100 bg-white px-4 py-12 text-center shadow-[0_16px_50px_rgba(22,37,74,0.10)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-jobly-blue text-xl text-white" aria-hidden="true">🔔</span>
              <p className="font-heading text-base font-extrabold text-navy">Aucune notification pour l'instant</p>
              <p className="max-w-xs text-sm text-jobly-gray">Vous serez prévenu ici dès qu'il y aura du nouveau sur vos candidatures, vos offres, votre compte ou Community.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.link && router.push(item.link)}
                  className="w-full rounded-[24px] border border-slate-100 bg-white p-5 text-left shadow-[0_16px_50px_rgba(22,37,74,0.08)]"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFF3B8] text-sm">J</span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-navy">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-jobly-gray">{item.body}</p>
                      <p className="mt-2 text-[11px] font-bold text-slate-400">{new Date(item.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

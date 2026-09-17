"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type Item = {
  id: string; kind: "EMPLOI" | "STAGE" | "FORMATION"; title: string; company: string; logoUrl: string | null;
  sourceType: "discovery" | "recruiter" | "external"; sourceUrl: string | null; matchScore: number; score: number; badge: string; location: string | null;
};

const transitions = ["slideLeft", "slideRight", "slideUp", "zoom", "flip", "rotate", "blur", "bounce"] as const;

function fallbackLogo(company: string) {
  const initials = company.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "J";
  return <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-jobly-blue text-base font-black text-white">{initials}</span>;
}

export default function OpportunityCascade() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [transition, setTransition] = useState<(typeof transitions)[number]>("slideLeft");
  const [logoFailed, setLogoFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchX = useRef<number | null>(null);
  const lastTransition = useRef<(typeof transitions)[number] | null>(null);

  const item = items[index];
  const dot = useMemo(() => items.map((_, i) => i), [items.length]);

  function nextTransition() {
    if ((transitions.length as number) === 1) return transitions[0];
    let next = transitions[Math.floor(Math.random() * transitions.length)];
    while (next === lastTransition.current) next = transitions[Math.floor(Math.random() * transitions.length)];
    lastTransition.current = next;
    return next;
  }

  useEffect(() => {
    let cancelled = false;
    getSupabaseClient().auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      try {
        const response = await fetch("/api/opportunity-cascade", { headers: { Authorization: `Bearer ${data.session.access_token}` } });
        const body = await response.json();
        if (!cancelled) setItems(Array.isArray(body.opportunities) ? body.opportunities : []);
      } catch {
        if (!cancelled) setItems([]);
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!items.length || paused) return;
    const timer = setInterval(() => {
      setPhase(1);
      setTransition(nextTransition());
      setIndex((i) => (i + 1) % items.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [items.length, paused]);

  useEffect(() => {
    setLogoFailed(false);
    if (!item) return;
    const t1 = setTimeout(() => setPhase(2), 1000);
    const t2 = setTimeout(() => setPhase(3), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [index, item?.id]);

  useEffect(() => () => { if (resumeTimer.current) clearTimeout(resumeTimer.current); }, []);

  function manual(delta: number) {
    if (!items.length) return;
    setPhase(1);
    setTransition(nextTransition());
    setIndex((i) => (i + delta + items.length) % items.length);
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 5000);
  }

  function openItem() {
    if (!item) return;
    if (item.sourceType !== "external") {
      const jobId = item.id.split(":")[1] || item.id;
      router.push(`/offre/${encodeURIComponent(jobId)}?source=${encodeURIComponent(item.sourceType)}`);
    } else if (item.sourceUrl) {
      window.open(item.sourceUrl, "_blank", "noopener,noreferrer");
    }
  }

  if (!item) return null;

  return (
    <section className="my-3 rounded-[18px] bg-[#FFFBE6] p-3" aria-label="Entreprises qui recrutent">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 className="text-[15px] font-extrabold text-navy">Les entreprises qui recrutent 🔥</h2>
        <span className="flex h-5 min-w-[42px] items-center justify-center rounded-full border border-slate-200 bg-white px-2 text-[10px] font-black text-navy">{index + 1}/{items.length}</span>
      </div>
      <div
        className={`relative flex h-[148px] w-full items-center justify-center overflow-hidden rounded-[18px] border-[5px] border-[#FFDE00] bg-white p-[14px] shadow-[0_8px_22px_rgba(22,37,74,0.10)] cascade-${transition}`}
        onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
        onTouchStart={(e) => { setPaused(true); touchX.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => { const end = e.changedTouches[0]?.clientX ?? null; if (touchX.current !== null && end !== null && Math.abs(end - touchX.current) > 45) manual(end < touchX.current ? 1 : -1); else setPaused(false); touchX.current = null; }}
      >
        <button type="button" aria-label="Opportunité précédente" className="absolute left-1.5 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/15 text-lg text-navy" onClick={() => manual(-1)}>‹</button>
        <button type="button" onClick={openItem} className="flex w-full flex-col items-center justify-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-jobly-blue">
          {item.logoUrl && !logoFailed ? <img src={item.logoUrl} alt="" className="h-14 w-14 rounded-2xl object-contain" onError={() => setLogoFailed(true)} /> : fallbackLogo(item.company)}
          {phase >= 2 && <span className="rounded-md bg-[#FFDE00] px-2.5 py-1 text-[13px] font-bold text-navy">{item.badge}</span>}
          {phase >= 3 && <span className="max-w-[90%] truncate rounded-md bg-[#0B1A3A] px-2.5 py-1 text-[13px] font-bold text-white">{item.title}</span>}
        </button>
        <button type="button" aria-label="Opportunité suivante" className="absolute right-1.5 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/15 text-lg text-navy" onClick={() => manual(1)}>›</button>
      </div>
      <div className="mt-2 flex justify-center gap-1">
        {dot.map((i) => <button key={i} type="button" aria-label={`Opportunité ${i + 1}`} onClick={() => manual(i - index)} className={i === index ? "h-1.5 w-5 rounded-full bg-[#FFDE00]" : "h-1.5 w-1.5 rounded-full bg-slate-300"} />)}
      </div>
    </section>
  );
}

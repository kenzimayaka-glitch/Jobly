"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

export type CareerOsData = {
  goals: string[];
  targetCity: string;
  yearsExperience: number;
  currentLevel: number;
  currentLevelLabel: string;
  targetLevel: number;
  targetLevelLabel: string;
  readiness: number;
  dimensions: Record<string, { score: number; weight: number; evidence: string[] }>;
  criteria: string[];
  gap: string[];
  nextBestAction: string;
  roadmap: { step: number; title: string; done: boolean; action: string }[];
  publicDiscoverable: boolean;
  profileCompleteness: { skills: number; experiences: number; education: number };
};

export type LoadStatus = "loading" | "ready" | "error";

/** Charge /api/career-os dans la langue courante ; redirige vers l’accueil sans session. */
export function useCareerOs() {
  const router = useRouter();
  const { lang } = useI18n();
  const [data, setData] = useState<CareerOsData | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) { router.replace("/"); return; }
      const res = await fetch(`/api/career-os?lang=${lang}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) { setStatus("error"); return; }
      setData(await res.json());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [router, lang]);

  useEffect(() => { void load(); }, [load]);
  return { data, setData, status, reload: load };
}

export type FeedJob = {
  source: "discovery" | "recruiter";
  id: string;
  title: string;
  location: string | null;
  contractType: string | null;
  remoteMode: string | null;
  company: { name: string; logoUrl: string | null } | null;
  matchPercent: number;
};

/** Échantillon des offres du flux (mêmes données que /jobs) pour Radar et Marché. */
export function useJobsSample(limit = 40) {
  const router = useRouter();
  const [jobs, setJobs] = useState<FeedJob[]>([]);
  const [totalActive, setTotalActive] = useState(0);
  const [status, setStatus] = useState<LoadStatus>("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) { router.replace("/"); return; }
      const res = await fetch(`/api/jobs?limit=${limit}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) { setStatus("error"); return; }
      const body = await res.json();
      setJobs(Array.isArray(body.jobs) ? body.jobs : []);
      setTotalActive(Number(body.totalActive ?? body.count ?? 0));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [router, limit]);

  useEffect(() => { void load(); }, [load]);
  return { jobs, totalActive, status, reload: load };
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import { getSupabaseClient } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

type CampusInstitution = {
  id: string;
  name: string;
  city: string | null;
  type: string;
  memberCount: number;
  isMember: boolean;
};

type CampusOpportunity = {
  id: string;
  source: "discovery" | "recruiter";
  title: string;
  description: string;
  companyName: string | null;
  logoUrl: string | null;
  location: string | null;
  contractType: string | null;
  remoteMode: string | null;
  publishedAt: string | null;
  publicationDateEstimated: boolean;
  category: "INTERNSHIP" | "ALTERNANCE" | "STUDENT_JOB";
  href: string;
};

export default function CampusPage() {
  const router = useRouter();
  const { t, formatDate } = useI18n();
  const [items, setItems] = useState<CampusOpportunity[]>([]);
  const [institutions, setInstitutions] = useState<CampusInstitution[]>([]);
  const [institutionCount, setInstitutionCount] = useState(0);
  const [institutionMemberCount, setInstitutionMemberCount] = useState(0);
  const [institutionError, setInstitutionError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session?.access_token) {
        router.replace("/login?next=/campus");
        return;
      }
      const response = await fetch("/api/campus/opportunities", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || t("common.error.generic"));
      setItems(Array.isArray(body.items) ? body.items : []);

      try {
        const institutionsResponse = await fetch("/api/campus/institutions", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const institutionsBody = await institutionsResponse.json().catch(() => ({}));
        if (!institutionsResponse.ok) throw new Error(institutionsBody.error || t("common.error.generic"));
        const nextInstitutions = Array.isArray(institutionsBody.institutions) ? institutionsBody.institutions : [];
        setInstitutions(nextInstitutions);
        setInstitutionCount(Number(institutionsBody.count) || nextInstitutions.length);
        setInstitutionMemberCount(Number(institutionsBody.activeMemberCount) || 0);
        setInstitutionError("");
      } catch (cause) {
        setInstitutionError(cause instanceof Error ? cause.message : t("common.error.generic"));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("common.error.generic"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => filter === "ALL" ? items : items.filter((item) => item.category === filter), [items, filter]);
  const institutionTypeLabel = (value: string) => {
    if (value === "UNIVERSITY") return t("campus.page.institutionTypeUniversity");
    if (value === "GRANDE_ECOLE") return t("campus.page.institutionTypeGrandeEcole");
    if (value === "INSTITUT") return t("campus.page.institutionTypeInstitute");
    return t("campus.page.institutionTypeOther");
  };

  const labelFor = (value: string) => value === "INTERNSHIP"
    ? t("campus.page.internship")
    : value === "ALTERNANCE"
      ? t("campus.page.alternance")
      : t("campus.page.studentJob");

  return (
    <AppShell role="talent" active="/career-brain" title={t("career.campus.title")} eyebrow="JOBLY CAMPUS" width="lg">
      <section className="mb-6 rounded-[28px] bg-gradient-to-br from-[#FFF1A8] via-[#FFD95A] to-[#FFE135] p-6 sm:p-8">
        <p className="text-[11px] font-black uppercase tracking-[.16em] text-[#645000]">{t("campus.page.eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0B1F4B]">{t("career.campus.title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#514400]">{t("campus.page.description")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/65 px-3 py-1.5 text-xs font-black text-[#514400]">{t("campus.page.count", { n: items.length })}</span>
          <button type="button" onClick={() => router.push("/talent/cvs")} className="rounded-full bg-[#0B1F4B] px-3.5 py-1.5 text-xs font-black text-white">{t("campus.page.cv")}</button>
        </div>
      </section>

      <section className="mb-7 rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="campus-institutions-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#1877B9]">{t("campus.page.institutionsEyebrow")}</p>
            <h2 id="campus-institutions-title" className="mt-1 text-xl font-black text-[#0B1F4B]">{t("campus.page.institutionsTitle")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{t("campus.page.institutionsDescription")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#EEF2FF] px-3 py-1.5 text-xs font-black text-[#22448B]">{t("campus.page.institutionCount", { n: institutionCount })}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">{t("campus.page.institutionMembers", { n: institutionMemberCount })}</span>
          </div>
        </div>

        {institutionError ? (
          <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{institutionError}</p>
        ) : institutions.length === 0 ? (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{t("campus.page.institutionEmpty")}</p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {institutions.map((institution) => (
              <article key={institution.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-lg text-[#22448B]">🎓</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">{institutionTypeLabel(institution.type)}</span>
                </div>
                <h3 className="mt-3 text-sm font-black leading-5 text-[#0B1F4B]">{institution.name}</h3>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span>{institution.city || t("campus.page.institutionCityUnknown")}</span>
                  <span>{t("campus.page.institutionMembers", { n: institution.memberCount })}</span>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="max-w-xl text-xs leading-5 text-slate-500">{t("campus.page.institutionConnectionNote")}</p>
          <button type="button" onClick={() => router.push("/communities")} className="rounded-xl bg-[#0B1F4B] px-4 py-2.5 text-xs font-black text-white">{t("campus.page.communitiesLink")} →</button>
        </div>
      </section>

      <div className="mb-5 flex flex-wrap gap-2">
        {["ALL", "INTERNSHIP", "ALTERNANCE", "STUDENT_JOB"].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`rounded-full px-3.5 py-2 text-xs font-black ${filter === value ? "bg-[#0B1F4B] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {value === "ALL" ? t("campus.page.all") : labelFor(value)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">{t("common.loading")}</div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p>{error}</p>
          <button type="button" onClick={() => void load()} className="mt-3 font-black underline">{t("common.retry")}</button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-black text-[#0B1F4B]">{t("campus.page.emptyTitle")}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{t("campus.page.emptyDescription")}</p>
          <button type="button" onClick={() => router.push("/jobs")} className="mt-4 rounded-xl bg-[#0B1F4B] px-4 py-2.5 text-xs font-black text-white">{t("campus.page.allJobs")}</button>
        </div>
      ) : (
        <section className="grid gap-3 md:grid-cols-2">
          {visible.map((item) => (
            <article key={`${item.source}:${item.id}`} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                {item.logoUrl ? (
                  <img src={item.logoUrl} alt="" className="h-11 w-11 rounded-xl object-contain" />
                ) : (
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#EEF2FF] text-sm font-black text-[#22448B]">J</span>
                )}
                <div className="min-w-0 flex-1">
                  <span className="rounded-full bg-[#FFF4BF] px-2.5 py-1 text-[10px] font-black text-[#695500]">{labelFor(item.category)}</span>
                  <h2 className="mt-2 text-base font-black leading-6 text-[#0B1F4B]">{item.title}</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{item.companyName || t("career.unknownCompany")}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                {item.location && <span>{item.location}</span>}
                {item.contractType && <span>· {item.contractType}</span>}
                {item.publishedAt && <span>· {formatDate(item.publishedAt)}</span>}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              {item.publicationDateEstimated && <p className="mt-2 text-[10px] text-slate-400">{t("campus.page.estimatedDate")}</p>}
              <a href={item.href} className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-[#0B1F4B] px-4 py-3 text-xs font-black text-white">
                {t("campus.page.openOffer")} →
              </a>
            </article>
          ))}
        </section>
      )}
      <p className="mt-6 text-xs leading-5 text-slate-400">{t("campus.page.sourceNote")}</p>
    </AppShell>
  );
}

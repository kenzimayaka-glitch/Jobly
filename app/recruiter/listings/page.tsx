"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Recruitment = {
  id: string;
  recruiterJobId: string;
  currentState: string;
  job: { id: string; title: string; companyName: string; status: string } | null;
  versions: { id: string; versionNumber: number; title: string; status: string }[];
};

const stages = ["CV","TEST","INTERVIEW","DECISION"] as const;
const themes = ["OFFICIAL_CONCOURS","MODERNE","SOBRE"] as const;

export default function RecruiterOfficialListingsPage() {
  const [items, setItems] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [stage, setStage] = useState<(typeof stages)[number]>("CV");
  const [theme, setTheme] = useState<(typeof themes)[number]>("OFFICIAL_CONCOURS");
  const [jpegSize, setJpegSize] = useState("640");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const session = await getSupabaseClient().auth.getSession();
    if (!session.data.session) {
      setError("Session recruteur requise.");
      setLoading(false);
      return;
    }
    const response = await fetch("/api/recruitment360/listings", {
      headers: { Authorization: `Bearer ${session.data.session.access_token}` },
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) setError(payload.message || "Impossible de charger les recrutements.");
    else setItems(payload.recruitments || []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function generate(item: Recruitment, format: string) {
    const version = item.versions[0];
    if (!version) return;
    setBusy(`${item.id}-${format}`);
    setResult(null);
    try {
      const session = await getSupabaseClient().auth.getSession();
      if (!session.data.session) throw new Error("Session recruteur requise.");
      const response = await fetch("/api/recruitment360/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          recruitmentId: item.id,
          versionId: version.id,
          stage,
          theme,
          format,
          size: format === "JPEG" ? jpegSize : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Génération impossible.");
      setResult(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Génération impossible.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 pb-28 pt-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#22448B]">Recrutement</p>
          <h1 className="mt-1 text-3xl font-bold">Listings officiels</h1>
          <p className="mt-2 text-sm text-slate-600">
            Générez un document officiel à chaque étape. Les candidats publiés sont toujours recalculés côté serveur.
          </p>
        </header>

        <section className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
          <label className="text-sm font-medium">Étape
            <select value={stage} onChange={e => setStage(e.target.value as any)} className="mt-1 w-full rounded-xl border bg-white p-3">
              {stages.map(x => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Thème
            <select value={theme} onChange={e => setTheme(e.target.value as any)} className="mt-1 w-full rounded-xl border bg-white p-3">
              {themes.map(x => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">JPEG
            <select value={jpegSize} onChange={e => setJpegSize(e.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3">
              <option value="640">640 × 1280</option>
              <option value="2160">2160 × 4320</option>
              <option value="4320">4320 × 8640 (8K)</option>
            </select>
          </label>
        </section>

        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {loading ? <div className="rounded-2xl border p-6 text-sm text-slate-500">Chargement…</div> :
          items.length === 0 ? <div className="rounded-2xl border p-6 text-sm text-slate-500">Aucun recrutement accessible.</div> :
          <div className="space-y-4">
            {items.map(item => {
              const version = item.versions[0];
              return <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{item.job?.title || version?.title || "Poste"}</h2>
                    <p className="text-sm text-slate-500">{item.job?.companyName || "Organisation"} · {item.currentState}</p>
                  </div>
                  <span className="text-xs text-slate-500">Version {version?.versionNumber || item.version}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {(["PDF","XLSX","WEB","JPEG"] as const).map(format =>
                    <button
                      key={format}
                      disabled={!!busy || !version}
                      onClick={() => void generate(item, format)}
                      className="rounded-xl bg-[#22448B] px-3 py-3 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {busy === `${item.id}-${format}` ? "Génération…" : format}
                    </button>
                  )}
                </div>
              </article>;
            })}
          </div>
        }

        {result && <section className="mt-6 rounded-2xl border border-[#22448B]/20 bg-[#22448B]/5 p-5">
          <h2 className="font-bold text-[#22448B]">Export généré</h2>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {result.publicUrl && <a className="rounded-xl bg-[#22448B] px-4 py-3 font-semibold text-white" href={result.publicUrl} target="_blank" rel="noreferrer">Page officielle</a>}
            {result.downloadUrl && <a className="rounded-xl border border-[#22448B] px-4 py-3 font-semibold text-[#22448B]" href={result.downloadUrl} target="_blank" rel="noreferrer">Télécharger</a>}
            {Array.isArray(result.signedUrls) && result.signedUrls.map((x:any) =>
              x.url ? <a key={x.path} className="rounded-xl border border-[#22448B] px-4 py-3 font-semibold text-[#22448B]" href={x.url} target="_blank" rel="noreferrer">JPEG {x.path.split("/").pop()}</a> : null
            )}
          </div>
          {result.fallback && <p className="mt-3 text-sm font-medium text-amber-700">Le 8K a été automatiquement ramené à la résolution inférieure disponible dans le profil FREE_TEST.</p>}
          {result.iframeCode && <textarea readOnly value={result.iframeCode} className="mt-4 min-h-24 w-full rounded-xl border bg-white p-3 text-xs" />}
        </section>}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { CAMEROON_CITIES, type CameroonCityKey } from "../../../../../lib/cities";
import MapPreview from "../../../../../components/mobility/MapPreview";

type ApplicationSummary = {
  id: string;
  Job?: { location?: string | null } | null;
  RecruiterJob?: { location?: string | null; companyName?: string | null } | null;
};

export default function RequestPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [application, setApplication] = useState<ApplicationSummary | null>(null);
  const [loadingApplication, setLoadingApplication] = useState(true);
  const [depart, setDepart] = useState<CameroonCityKey>("YAOUNDE");
  const [arrivee, setArrivee] = useState<CameroonCityKey>("DOUALA");
  const [type, setType] = useState("CHAMBRE");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await getSupabaseClient().auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) throw new Error("Session Jobly requise. Reconnecte-toi pour vérifier ton offre acceptée.");
        const response = await fetch("/api/matches/last-accepted", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.message || "Impossible de vérifier ton offre acceptée.");
        if (!active) return;
        const selected = payload?.application as ApplicationSummary | null;
        if (selected?.id) {
          setApplication(selected);
          const city = String(selected.RecruiterJob?.location || selected.Job?.location || "").toLowerCase();
          const match = Object.entries(CAMEROON_CITIES).find(([, cityData]) => city.includes(cityData.name.toLowerCase()));
          if (match) setArrivee(match[0] as CameroonCityKey);
        } else {
          setMessage("Mobility s'ouvre à partir d'une offre recruteur acceptée. Aucune candidature avec offre n'a été trouvée.");
        }
      } catch {
        if (active) setMessage("Impossible de vérifier ton offre acceptée. Réessaie après avoir actualisé ta candidature.");
      } finally {
        if (active) setLoadingApplication(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function save() {
    if (!application?.id) {
      setMessage("Une candidature liée à une offre recruteur acceptée est obligatoire.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const session = await getSupabaseClient().auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Session requise.");
      const response = await fetch("/api/mobility/request", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application.id, departKey: depart, arriveeKey: arrivee, typeLocal: type }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Création impossible.");
      localStorage.setItem("jobly-mobility-request", JSON.stringify(payload.request));
      router.push("/bons-plans/mobility/talent/status");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de créer la demande.");
    } finally {
      setSaving(false);
    }
  }

  const selectedCity = application?.RecruiterJob?.location || application?.Job?.location || "non précisée";

  return (
    <section className="min-h-[100dvh] bg-transparent px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <span className="rounded-full bg-[#FFF5CC] px-3 py-1 text-xs font-black text-[#8A6500]">MA DEMANDE</span>
        <h1 className="mt-4 text-3xl font-black">Rejoindre l'emploi obtenu</h1>
        <p className="mt-2 text-sm text-slate-500">Le salaire de référence est lu depuis l'offre recruteur acceptée. Il ne peut pas être saisi ou modifié par le Talent.</p>

        <div className="mt-5 rounded-2xl border bg-white p-4">
          {loadingApplication ? (
            <p className="text-sm text-slate-500">Vérification de l'offre acceptée…</p>
          ) : application ? (
            <>
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Candidature sélectionnée</p>
              <p className="mt-1 break-all text-sm font-bold">{application.id}</p>
              <p className="mt-1 text-xs text-slate-500">Destination issue de la candidature : {selectedCity}</p>
            </>
          ) : (
            <p className="text-sm font-bold text-amber-800">Aucune offre acceptée disponible pour le moment.</p>
          )}
        </div>

        <div className="mt-6 grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((number) => (
            <div key={number} className={`h-2 rounded-full ${number <= step ? "bg-[#0A3D9C]" : "bg-slate-200"}`} />
          ))}
        </div>

        {message && <div className="mt-5 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</div>}

        <div className="talent-card mt-6 rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
          {step === 1 && (
            <>
              <h2 className="text-xl font-black">1. Ton trajet</h2>
              <p className="mt-1 text-sm text-slate-500">Confirme la ville de départ et la destination liée à l'emploi obtenu.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-black">
                  Départ
                  <select value={depart} onChange={(event) => setDepart(event.target.value as CameroonCityKey)} className="mt-2 w-full rounded-2xl border p-3">
                    {Object.entries(CAMEROON_CITIES).map(([key, city]) => <option key={key} value={key}>{city.name}</option>)}
                  </select>
                </label>
                <label className="text-xs font-black">
                  Destination
                  <select value={arrivee} onChange={(event) => setArrivee(event.target.value as CameroonCityKey)} className="mt-2 w-full rounded-2xl border p-3">
                    {Object.entries(CAMEROON_CITIES).map(([key, city]) => <option key={key} value={key}>{city.name}</option>)}
                  </select>
                </label>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-xl font-black">2. Besoin de logement</h2>
              <p className="mt-1 text-sm text-slate-500">Le moteur estime le coût initial. Le salaire reste celui de l'offre acceptée.</p>
              <label className="mt-5 block text-xs font-black">
                Type de logement
                <select value={type} onChange={(event) => setType(event.target.value)} className="mt-2 w-full rounded-2xl border p-3">
                  <option value="CHAMBRE">Chambre</option>
                  <option value="STUDIO">Studio</option>
                  <option value="APPART">Appartement</option>
                </select>
              </label>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-xl font-black">3. Vérification GPS</h2>
              <p className="mt-1 text-sm text-slate-500">Trajet estimé entre les villes sélectionnées.</p>
              <div className="mt-5">
                <MapPreview
                  from={{ ...CAMEROON_CITIES[depart], label: CAMEROON_CITIES[depart].name }}
                  to={{ ...CAMEROON_CITIES[arrivee], label: CAMEROON_CITIES[arrivee].name }}
                />
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="text-xl font-black">4. Ouverture du dossier</h2>
              <p className="mt-2 text-sm text-slate-500">Après le contrôle de l'offre, du salaire, de la convention employeur et du seuil, tu pourras déposer tes pièces dans « Mon dossier Mobility ».</p>
              <div className="mt-4 rounded-2xl bg-[#FFF8D9] p-4 text-sm font-bold">Aucune pièce d'identité ni aucun financement n'est validé à cette étape.</div>
            </>
          )}

          <div className="mt-7 flex gap-3">
            <button disabled={step === 1 || saving} onClick={() => setStep((current) => current - 1)} className="rounded-full border px-5 py-3 font-black disabled:opacity-40">Retour</button>
            {step < 4 ? (
              <button disabled={(step === 1 && (!application || loadingApplication)) || saving} onClick={() => setStep((current) => current + 1)} className="flex-1 rounded-full bg-[#0A3D9C] px-5 py-3 font-black text-white disabled:opacity-40">Continuer</button>
            ) : (
              <button disabled={!application || saving || loadingApplication} onClick={save} className="flex-1 rounded-full bg-[#FFE135] px-5 py-3 font-black text-[#0A1931] disabled:opacity-40">
                {saving ? "Création…" : "Créer ma demande"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../lib/supabase";

type Ecosystem = "TALENT" | "RECRUITER" | "PARTNER";
type Mode = "text" | "voice";

type Preferences = {
  access_enabled: boolean;
  interaction_mode: Mode;
  notification_mode: Mode;
  proactive_recommendations: boolean;
};

const defaults: Preferences = {
  access_enabled: true,
  interaction_mode: "text",
  notification_mode: "text",
  proactive_recommendations: true,
};

const labels: Record<Ecosystem, string> = {
  TALENT: "Talent",
  RECRUITER: "Recruiter",
  PARTNER: "Partner",
};

export default function JiaPreferences({ ecosystem }: { ecosystem: Ecosystem }) {
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("jia_preferences")
          .select("access_enabled,interaction_mode,notification_mode,proactive_recommendations")
          .eq("user_id", user.id)
          .eq("ecosystem", ecosystem)
          .maybeSingle();
        if (active && data) setPrefs(data as Preferences);
      } catch {}
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [ecosystem]);

  async function save(next: Partial<Preferences>) {
    const value = { ...prefs, ...next };
    setPrefs(value);
    setMessage("Enregistrement…");
    try {
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session Jobly introuvable.");
      const { error } = await supabase.from("jia_preferences").upsert({
        user_id: user.id,
        ecosystem,
        ...value,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,ecosystem" });
      if (error) throw error;
      window.dispatchEvent(new CustomEvent("jobly:jia-preferences-changed", { detail: { mode: value.interaction_mode, enabled: value.access_enabled, proactive: value.proactive_recommendations } }));
      setMessage("Préférences J’IA enregistrées.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Impossible d’enregistrer.");
    }
    window.setTimeout(() => setMessage(""), 2200);
  }

  const toggle = (value: boolean, onChange: (v: boolean) => void) => (
    <button type="button" onClick={() => onChange(!value)} className={`h-7 w-12 rounded-full p-1 transition ${value ? "bg-jobly-blue" : "bg-slate-200"}`} aria-pressed={value}>
      <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${value ? "translate-x-5" : ""}`} />
    </button>
  );

  return (
    <section className="rounded-[24px] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-extrabold">J’IA — assistant {labels[ecosystem]}</h2>
          <p className="mt-1 text-xs leading-5 text-jobly-gray">
            J’IA te demande et gère ici ses accès pour cet écosystème. Tu peux les modifier à tout moment.
          </p>
        </div>
        {toggle(prefs.access_enabled, v => save({ access_enabled: v }))}
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-jobly-gray">Accès J’IA</p>
          <p className="mt-1 text-sm font-bold">{prefs.access_enabled ? "J’IA est autorisée" : "J’IA est désactivée"}</p>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-wide text-jobly-gray">Comment J’IA te répond</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["text","voice"] as Mode[]).map(mode => (
              <button key={mode} type="button" disabled={!prefs.access_enabled} onClick={() => save({ interaction_mode: mode })}
                className={`rounded-2xl border px-4 py-3 text-sm font-extrabold ${prefs.interaction_mode === mode && prefs.access_enabled ? "border-jobly-blue bg-blue-50 text-jobly-blue" : "border-slate-200 text-slate-600"}`}>
                {mode === "text" ? "Texte seulement" : "Vocal"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-wide text-jobly-gray">Notifications J’IA</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["text","voice"] as Mode[]).map(mode => (
              <button key={mode} type="button" disabled={!prefs.access_enabled} onClick={() => save({ notification_mode: mode })}
                className={`rounded-2xl border px-4 py-3 text-sm font-extrabold ${prefs.notification_mode === mode && prefs.access_enabled ? "border-jobly-blue bg-blue-50 text-jobly-blue" : "border-slate-200 text-slate-600"}`}>
                {mode === "text" ? "Texte seulement" : "Vocal"}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-jobly-gray">Le vocal utilise les capacités du téléphone/navigateur et nécessite l’autorisation correspondante.</p>
        </div>

        <label className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 text-sm font-bold">
          <span><span className="block">Recommandations proactives</span><span className="mt-1 block text-[10px] font-medium text-jobly-gray">J’IA peut te signaler une offre, une échéance ou une action utile.</span></span>
          {toggle(prefs.proactive_recommendations, v => save({ proactive_recommendations: v }))}
        </label>
      </div>

      {loading && <p className="mt-3 text-[10px] text-jobly-gray">Chargement des préférences…</p>}
      {message && <p className="mt-3 text-xs font-bold text-jobly-blue">{message}</p>}
    </section>
  );
}

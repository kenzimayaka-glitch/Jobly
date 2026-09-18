"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "../lib/supabase";
import PageHeader from "./PageHeader";
import BottomNav from "./BottomNav";
import TalentBackground from "./TalentBackground";

/* ---------- Renderer structuré pour la sortie J'IA ----------
 * Les différents moteurs (GROQ, OpenRouter, Gemini, fallback déterministe…)
 * ne renvoient pas exactement le même schéma JSON d'une opération à l'autre.
 * Ce renderer affiche n'importe quel objet/array de façon lisible,
 * sans jamais retomber sur du JSON brut.
 */

const LABELS: Record<string, string> = {
  action: "Action",
  description: "Description",
  concreteSteps: "Étapes concrètes",
  objective: "Objectif",
  objectives: "Objectifs",
  priority: "Priorité",
  checkpoint: "Point de contrôle",
  effort: "Effort estimé",
  questions: "Questions à préparer",
  focus: "Points clés",
  warnings: "Points de vigilance",
  cvSuggestions: "Suggestions CV",
  coverLetterOutline: "Plan de lettre de motivation",
  submission: "Soumission",
  summary: "Résumé",
  nextActions: "Prochaines actions",
  nextBestAction: "Prochaine action prioritaire",
  readiness: "Niveau de préparation",
  recommendations: "Recommandations",
  tips: "Conseils",
  strengths: "Points forts",
  improvements: "Axes d'amélioration",
  gaps: "Écarts identifiés",
  timeline: "Calendrier",
  resources: "Ressources",
};

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: "bg-red-50 text-red-600",
  MEDIUM: "bg-amber-50 text-amber-600",
  LOW: "bg-slate-100 text-slate-600",
};

function humanize(key: string) {
  if (LABELS[key]) return LABELS[key];
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function Badge({ text }: { text: string }) {
  const cls = PRIORITY_STYLES[text.toUpperCase()] || "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${cls}`}>
      {text}
    </span>
  );
}

function ScalarValue({ value }: { value: string | number }) {
  if (typeof value === "number") return <span className="font-black text-jobly-blue">{value}</span>;
  const upper = String(value).toUpperCase();
  if (upper === "HIGH" || upper === "MEDIUM" || upper === "LOW") return <Badge text={String(value)} />;
  return <p className="text-sm text-slate-600">{String(value)}</p>;
}

function ListOfStrings({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-600">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-jobly-blue" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function FieldBlock({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value) && value.length === 0) return null;

  if (typeof value === "string" || typeof value === "number") {
    return (
      <div>
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
        <div className="mt-1">
          <ScalarValue value={value} />
        </div>
      </div>
    );
  }

  if (Array.isArray(value)) {
    const allScalar = value.every((v) => typeof v === "string" || typeof v === "number");
    return (
      <div>
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
        {allScalar ? (
          <ListOfStrings items={value.map(String)} />
        ) : (
          <div className="mt-2 space-y-3">
            {value.map((v, i) =>
              v && typeof v === "object" ? (
                <ObjectCard key={i} item={v as Record<string, unknown>} />
              ) : (
                <ScalarValue key={i} value={v as string} />
              )
            )}
          </div>
        )}
      </div>
    );
  }

  if (typeof value === "object") {
    return (
      <div>
        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</p>
        <div className="mt-2">
          <ObjectCard item={value as Record<string, unknown>} />
        </div>
      </div>
    );
  }

  return null;
}

function ObjectCard({ item }: { item: Record<string, unknown> }) {
  const titleKey = ["action", "objective", "title", "name", "question"].find((k) => typeof item[k] === "string");
  const title = titleKey ? String(item[titleKey]) : null;
  const rest = Object.entries(item).filter(([k]) => k !== titleKey && k !== "mode");

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      {title && <h3 className="text-base font-black text-navy">{title}</h3>}
      <div className={title ? "mt-3 space-y-3" : "space-y-3"}>
        {rest.map(([k, v]) => (
          <FieldBlock key={k} label={humanize(k)} value={v} />
        ))}
      </div>
    </div>
  );
}

function AiOutputView({ output }: { output: unknown }) {
  if (output === null || output === undefined) {
    return <p className="text-sm text-slate-500">Aucune donnée à afficher.</p>;
  }
  if (typeof output === "string") {
    return <p className="whitespace-pre-wrap text-sm text-slate-700">{output}</p>;
  }
  if (typeof output !== "object") {
    return <p className="text-sm text-slate-700">{String(output)}</p>;
  }

  const entries = Object.entries(output as Record<string, unknown>).filter(([k]) => k !== "mode");
  if (!entries.length) return <p className="text-sm text-slate-500">Aucune donnée à afficher.</p>;

  return (
    <div className="space-y-5">
      {entries.map(([k, v]) => (
        <div key={k}>
          <p className="text-xs font-black uppercase tracking-wide text-jobly-blue">{humanize(k)}</p>
          <div className="mt-2">
            {Array.isArray(v) ? (
              v.every((x) => typeof x === "string" || typeof x === "number") ? (
                <ListOfStrings items={v.map(String)} />
              ) : (
                <div className="space-y-3">
                  {v.map((item, i) =>
                    item && typeof item === "object" ? (
                      <ObjectCard key={i} item={item as Record<string, unknown>} />
                    ) : (
                      <ScalarValue key={i} value={item as string} />
                    )
                  )}
                </div>
              )
            ) : v && typeof v === "object" ? (
              <ObjectCard item={v as Record<string, unknown>} />
            ) : (
              <ScalarValue value={v as string | number} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Formulaires de saisie par opération ----------
 * L'API n'accepte qu'une liste précise de champs par opération
 * (voir sanitizeInput dans lib/aiGateway.ts) : on ne construit ici
 * que ces champs-là, pour que ce qui est tapé soit réellement transmis.
 */

type Operation = "INTERVIEW" | "LEARNING" | "APPLICATION_COPILOT" | "CAREER_COMPANION";

type UpgradeSuggestion = { shown: true; featureKey: string; benefit: string; targetPlan: string; reason: string; href: string };
type Exchange = { you: string; result?: any; error?: string; quotaExceeded?: boolean; upgradeSuggestion?: UpgradeSuggestion | null };

function InputForm({
  operation,
  lastQuestion,
  onSubmit,
  busy,
}: {
  operation: Operation;
  lastQuestion: string | null;
  onSubmit: (input: Record<string, string>, summary: string) => void;
  busy: boolean;
}) {
  const [role, setRole] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [answer, setAnswer] = useState("");
  const [goal, setGoal] = useState("");
  const [timePerWeek, setTimePerWeek] = useState("");
  const [blocker, setBlocker] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (operation === "INTERVIEW") {
      const combinedAnswer = lastQuestion ? `Question posée : ${lastQuestion}
Ma réponse : ${answer}` : answer;
      onSubmit({ role, difficulty, answer: combinedAnswer }, answer || `Entretien ciblé : ${role || "profil général"} (${difficulty})`);
      setAnswer("");
      return;
    }
    if (operation === "LEARNING") {
      onSubmit({ goal, timePerWeek }, goal || "Plan d'apprentissage");
      return;
    }
    if (operation === "APPLICATION_COPILOT") {
      onSubmit({ jobTitle, jobDescription }, jobTitle || "Assistant candidature");
      return;
    }
    onSubmit({ goal, blocker }, blocker || goal || "Prochaine étape carrière");
  }

  if (operation === "INTERVIEW")
    return (
      <form onSubmit={submit} className="space-y-3">
        {!lastQuestion && (
          <>
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Rôle visé (ex : Chargé de projet)" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm">
              <option value="EASY">Facile</option>
              <option value="MEDIUM">Moyen</option>
              <option value="HARD">Difficile</option>
            </select>
          </>
        )}
        {lastQuestion && (
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Tape ta réponse à la question ci-dessus…" rows={3} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" required />
        )}
        <button type="submit" disabled={busy} className="w-full rounded-2xl bg-jobly-blue px-5 py-3 font-extrabold text-white disabled:opacity-50">
          {busy ? "Analyse…" : lastQuestion ? "Envoyer ma réponse" : "Démarrer l'entretien"}
        </button>
      </form>
    );

  if (operation === "LEARNING")
    return (
      <form onSubmit={submit} className="space-y-3">
        <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Objectif d'apprentissage (ex : Excel avancé)" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" required />
        <input value={timePerWeek} onChange={(e) => setTimePerWeek(e.target.value)} placeholder="Temps disponible par semaine (ex : 3h)" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
        <button type="submit" disabled={busy} className="w-full rounded-2xl bg-jobly-blue px-5 py-3 font-extrabold text-white disabled:opacity-50">{busy ? "Analyse…" : "Parler à J'IA"}</button>
      </form>
    );

  if (operation === "APPLICATION_COPILOT")
    return (
      <form onSubmit={submit} className="space-y-3">
        <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Intitulé de l'offre ciblée" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" required />
        <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Colle ici la description de l'offre (facultatif mais recommandé)" rows={4} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
        <button type="submit" disabled={busy} className="w-full rounded-2xl bg-jobly-blue px-5 py-3 font-extrabold text-white disabled:opacity-50">{busy ? "Analyse…" : "Parler à J'IA"}</button>
      </form>
    );

  return (
    <form onSubmit={submit} className="space-y-3">
      <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ton objectif du moment (ex : changer de secteur)" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" required />
      <textarea value={blocker} onChange={(e) => setBlocker(e.target.value)} placeholder="Ce qui te bloque en ce moment (facultatif)" rows={2} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
      <button type="submit" disabled={busy} className="w-full rounded-2xl bg-jobly-blue px-5 py-3 font-extrabold text-white disabled:opacity-50">{busy ? "Analyse…" : "Parler à J'IA"}</button>
    </form>
  );
}

function extractQuestion(output: any): string | null {
  if (!output || typeof output !== "object") return null;
  const q = output.questions || output.question;
  if (Array.isArray(q) && q.length) return String(q[0]);
  if (typeof q === "string") return q;
  return null;
}

/* ---------- Composant principal ---------- */

export default function AiCareerAgent({
  operation,
  title,
  description,
}: {
  operation: Operation;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [credits, setCredits] = useState<{ provider: string; credits: number; remaining: number } | null>(null);

  const lastQuestion = operation === "INTERVIEW" ? extractQuestion(exchanges[exchanges.length - 1]?.result) : null;

  async function run(input: Record<string, string>, summary: string) {
    setBusy(true);
    try {
      const s = await getSupabaseClient().auth.getSession();
      if (!s.data.session) throw Error("Session requise.");
      const r = await fetch(`/api/ai/${operation}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${s.data.session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const b = await r.json();
      if (!r.ok) {
        setExchanges((prev) => [...prev, { you: summary, error: b.message || "Service IA indisponible.", quotaExceeded: r.status === 429, upgradeSuggestion: b.upgradeSuggestion || null }]);
        return;
      }
      setCredits({ provider: b.provider, credits: b.credits, remaining: b.remaining });
      setExchanges((prev) => [...prev, { you: summary, result: b.output }]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur";
      setExchanges((prev) => [...prev, { you: summary, error: message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="talent-shell relative min-h-[100dvh] bg-[#F7FAFF] pb-28 text-navy">
      <TalentBackground />
      <div className="relative z-10">
        <PageHeader eyebrow="J'IA · INTELLIGENCE JOBLY" label={title} onBack={() => router.push("/career-brain")} theme="talent" />
        <div className="mx-auto max-w-3xl px-5 py-6">
          <div className="talent-card rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-jobly-blue">J'IA · Intelligence JOBLY</p>
            <h1 className="mt-2 text-3xl font-black">{title}</h1>
            <p className="mt-2 text-slate-600">{description}</p>

            {exchanges.length > 0 && (
              <div className="mt-6 space-y-4">
                {exchanges.map((ex, i) => (
                  <div key={i} className="space-y-2">
                    <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-jobly-blue px-4 py-3 text-sm font-bold text-white">{ex.you}</div>
                    {ex.error ? (
                      <div className="rounded-2xl rounded-tl-sm bg-red-50 p-4 text-sm font-bold text-red-600">
                        {ex.error}
                        {ex.upgradeSuggestion && (
                          <div className="mt-3 rounded-2xl border border-blue-100 bg-white p-4 text-slate-700 shadow-sm">
                            <p className="text-sm font-extrabold text-navy">J’IA peut aller plus loin ici.</p>
                            <p className="mt-1 text-xs font-medium text-slate-500">{ex.upgradeSuggestion.benefit} avec la formule {ex.upgradeSuggestion.targetPlan}.</p>
                            <div className="mt-3 flex items-center gap-2">
                              <Link
                                href={ex.upgradeSuggestion.href}
                                onClick={() => { void fetch("/api/jia/subscription-nudge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featureKey: ex.upgradeSuggestion?.featureKey, action: "CLICKED", planCode: ex.upgradeSuggestion?.targetPlan }) }); }}
                                className="rounded-xl bg-jobly-blue px-4 py-2 text-xs font-black text-white"
                              >
                                Voir ce que permet cette formule
                              </Link>
                              <button
                                type="button"
                                onClick={() => { void fetch("/api/jia/subscription-nudge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featureKey: ex.upgradeSuggestion?.featureKey, action: "DISMISSED", planCode: ex.upgradeSuggestion?.targetPlan }) }); setExchanges((prev) => prev.map((item, idx) => idx === i ? { ...item, upgradeSuggestion: null } : item)); }}
                                className="px-2 py-2 text-xs font-bold text-slate-400"
                              >
                                Pas maintenant
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl rounded-tl-sm bg-slate-50 p-4">
                        <AiOutputView output={ex.result} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {exchanges[exchanges.length - 1]?.quotaExceeded ? (
              <Link href="/abonnement" className="mt-6 block w-full rounded-2xl bg-jobly-blue px-5 py-3 text-center font-extrabold text-white">
                Débloquer plus de crédits IA
              </Link>
            ) : (
              <div className="mt-6">
                <InputForm operation={operation} lastQuestion={lastQuestion} onSubmit={run} busy={busy} />
              </div>
            )}

            {credits && (
              <p className="mt-4 text-xs font-bold text-slate-400">
                J'IA · moteur interne : {credits.provider} · {credits.credits} crédit(s) consommé(s) · {credits.remaining} restant(s)
              </p>
            )}
          </div>
        </div>
      </div>
      <BottomNav active="/career-brain" />
    </main>
  );
}

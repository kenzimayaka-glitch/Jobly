"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import { Button, Card, ErrorState, LoadingState, PageIntro, Section } from "@/components/ui";
import TestProctoring from "@/components/recruitment360/TestProctoring";

export default function CandidateTest() {
  const params = useParams<{ id: string }>();
  const sp = useSearchParams();
  const applicationId = sp.get("applicationId") || "";
  const testId = params.id;
  const [test, setTest] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [left, setLeft] = useState(0);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [cameraConsent, setCameraConsent] = useState(false);
  const [proctoring, setProctoring] = useState({ online: true, fullscreen: false, camera: "not-requested" });

  async function load() {
    try {
      const r = await fetch("/api/recruitment360/tests?applicationId=" + encodeURIComponent(applicationId));
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      const t = (d.tests ?? []).find((x: any) => x.id === testId);
      if (!t) throw new Error("Test indisponible");
      setTest(t); setState("ready");
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur"); setState("error"); }
  }

  useEffect(() => { if (applicationId) void load(); else { setError("Candidature requise"); setState("error"); } }, [applicationId, testId]);

  async function start() {
    setError("");
    const r = await fetch("/api/recruitment360/tests/" + testId, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", applicationId }),
    });
    const d = await r.json();
    if (!r.ok) { setError(d.message); return; }
    setSession(d.session);
    setLeft(Math.max(0, Math.floor((new Date(d.session.expiresAt).getTime() - Date.now()) / 1000)));
    try { await document.documentElement.requestFullscreen?.(); } catch {}
  }

  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => setLeft(Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000))), 1000);
    const beat = setInterval(() => {
      void fetch("/api/recruitment360/tests/" + session.id, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "heartbeat" }),
      }).then((r) => r.json()).then((d) => d.session && setSession(d.session));
    }, 15000);
    return () => { clearInterval(timer); clearInterval(beat); };
  }, [session?.id, session?.expiresAt]);

  async function answer(q: any, value: any) {
    setAnswers((v) => ({ ...v, [q.id]: value }));
    if (!session) return;
    const r = await fetch("/api/recruitment360/tests/" + session.id, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "answer", questionId: q.id, answer: { value } }),
    });
    const d = await r.json();
    if (!r.ok) setError(d.message || "Sauvegarde impossible");
  }

  async function submit() {
    if (!session) return;
    const r = await fetch("/api/recruitment360/tests/" + session.id, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit" }),
    });
    const d = await r.json();
    if (!r.ok) { setError(d.message); return; }
    await fetch("/api/recruitment360/tests/proctoring/finalize", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: session.id }),
    }).catch(() => undefined);
    setSession(d.session); setLeft(0);
  }

  const mm = useMemo(() => String(Math.floor(left / 60)).padStart(2, "0") + ":" + String(left % 60).padStart(2, "0"), [left]);

  return <AppShell role="talent" active="/career" title={test?.title || "Test"} eyebrow="RECRUTEMENT 360°" initial="T" width="lg">
    <PageIntro eyebrow="LOT 8" title={test?.title || "Test de sélection"} subtitle="Chronomètre serveur, sauvegarde continue, reprise réseau et surveillance annoncée." />
    {state === "loading" && <LoadingState />}
    {state === "error" && <ErrorState title={error} onRetry={load} />}
    {state === "ready" && !session && <Card>
      <p className="text-sm">Durée : {Math.floor(test.durationSeconds / 60)} min · Tentatives : {test.maxAttempts}</p>
      <p className="mt-2 text-sm opacity-75">J’IA est verrouillée pendant ce test. Les signaux de surveillance sont des indicateurs techniques et ne constituent jamais une preuve de triche.</p>
      <label className="mt-4 flex items-start gap-3 rounded-xl border p-3 text-sm">
        <input type="checkbox" checked={cameraConsent} onChange={(e) => setCameraConsent(e.target.checked)} />
        <span>J'accepte, si je le souhaite, la détection locale par caméra. Aucune vidéo n'est envoyée au serveur.</span>
      </label>
      <Button className="mt-4" onClick={() => void start()}>Commencer le test</Button>
      {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}
    </Card>}
    {session && <div className="space-y-4">
      <TestProctoring sessionId={session.id} consentCamera={cameraConsent} onStatus={setProctoring} />
      <Card tone={left < 60 ? "highlight" : "default"}>
        <div className="flex items-center justify-between"><b>Temps restant</b><strong className="text-2xl">{mm}</strong></div>
        <p className="mt-2 text-xs opacity-70">Réseau : {proctoring.online ? "connecté" : "hors ligne — sauvegarde locale active"} · J’IA : verrouillée</p>
      </Card>
      {(test.RecruitmentTestQuestion ?? []).sort((a: any, b: any) => a.position - b.position).map((q: any, i: number) => <Card key={q.id}>
        <p className="font-black">{i + 1}. {q.prompt}</p>
        {q.type === "TEXT" ? <textarea className="mt-3 min-h-28 w-full rounded-xl border p-3" value={answers[q.id] ?? ""} onChange={(e) => void answer(q, e.target.value)} /> :
         q.type === "NUMBER" ? <input className="mt-3 w-full rounded-xl border p-3" type="number" value={answers[q.id] ?? ""} onChange={(e) => void answer(q, e.target.value)} /> :
         <div className="mt-3 space-y-2">{(q.options?.choices ?? q.options ?? []).map((o: any) => <label key={String(o.value ?? o)} className="flex gap-2 rounded-xl border p-3"><input type="radio" name={q.id} checked={answers[q.id] === String(o.value ?? o)} onChange={() => void answer(q, String(o.value ?? o))} />{String(o.label ?? o.value ?? o)}</label>)}</div>}
      </Card>)}
      <Button disabled={left <= 0 || session.status !== "RUNNING"} onClick={() => void submit()}>Soumettre définitivement</Button>
      {error && <p className="text-sm font-bold text-red-600">{error}</p>}
    </div>}
    {session && <Section title="Transparence"><Card><p className="text-xs opacity-70">Les événements enregistrés servent à contextualiser le test. Aucun signal automatique ne peut, à lui seul, rejeter votre candidature.</p></Card></Section>}
  </AppShell>;
}

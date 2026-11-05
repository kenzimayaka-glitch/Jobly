"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft, CheckCircle2, Chrome, CircleAlert, Download, ExternalLink,
  Laptop, LoaderCircle, LockKeyhole, PauseCircle, Puzzle, RefreshCw, ShieldCheck,
  Sparkles, Zap
} from "lucide-react";
import Link from "next/link";

type ExtensionStatus = {
  installed: boolean;
  enabled: boolean;
  version: string;
  sidePanelAvailable: boolean;
  minChromeVersion: number;
};
type BrowserInfo = { supported: boolean; version: number | null; reason: string };
type Detection = "checking" | "not-detected" | "inactive" | "active" | "error";

function detectChromeDesktop(): BrowserInfo {
  if (typeof navigator === "undefined") return { supported: false, version: null, reason: "Vérification du navigateur…" };
  const ua = navigator.userAgent || "";
  const mobile = /Android|iPhone|iPad|Mobile/i.test(ua);
  const edge = /Edg\//i.test(ua);
  const opera = /OPR\//i.test(ua);
  const chrome = ua.match(/Chrome\/(\d+)/i);
  const version = chrome ? Number(chrome[1]) : null;
  if (mobile) return { supported: false, version, reason: "L’extension est réservée aux navigateurs d’ordinateur. Sur Android, utilise le partage PWA de Jobly." };
  if (edge || opera || !chrome) return { supported: false, version, reason: "Ouvre cette page dans Google Chrome sur ordinateur pour installer l’extension bêta." };
  if (!version || version < 116) return { supported: false, version, reason: "Cette extension nécessite Chrome 116 ou une version plus récente." };
  return { supported: true, version, reason: "Google Chrome pour ordinateur est compatible." };
}

function makeNonce() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now()) + "-" + Math.random().toString(36).slice(2);
}

async function extensionRequest(type: "PING" | "ACTIVATE" | "PAUSE"): Promise<{ status?: ExtensionStatus; ok?: boolean; error?: string } | null> {
  return new Promise((resolve) => {
    const nonce = makeNonce();
    let settled = false;
    const finish = (value: { status?: ExtensionStatus; ok?: boolean; error?: string } | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      resolve(value);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = event.data;
      if (message?.source !== "JOBLY_EXTENSION" || message.nonce !== nonce) return;
      if (type === "PING" && message.type === "STATUS") finish({ status: message.status || undefined, error: message.error });
      if (type !== "PING" && message.type === "COMMAND_RESULT") finish({ ok: message.ok === true, status: message.status, error: message.error });
    };
    const timeout = window.setTimeout(() => finish(null), 1100);
    window.addEventListener("message", onMessage);
    window.postMessage({ source: "JOBLY_INSTALL_PORTAL", type, nonce }, window.location.origin);
  });
}

export default function JiaExtensionSetupPage() {
  const [browser, setBrowser] = useState<BrowserInfo>({ supported: false, version: null, reason: "Vérification du navigateur…" });
  const [detection, setDetection] = useState<Detection>("checking");
  const [extension, setExtension] = useState<ExtensionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [notice, setNotice] = useState("");
  const checking = useRef(false);

  const refreshStatus = useCallback(async () => {
    if (!browser.supported || checking.current || document.visibilityState === "hidden") return;
    checking.current = true;
    setDetection((current) => current === "active" || current === "inactive" ? current : "checking");
    try {
      const response = await extensionRequest("PING");
      if (!response?.status?.installed) {
        setExtension(null);
        setDetection("not-detected");
      } else {
        setExtension(response.status);
        setDetection(response.status.enabled ? "active" : "inactive");
      }
    } catch {
      setDetection("error");
    } finally {
      checking.current = false;
      setLastChecked(new Date());
    }
  }, [browser.supported]);

  useEffect(() => {
    const info = detectChromeDesktop();
    setBrowser(info);
    if (!info.supported) {
      setDetection("not-detected");
      return;
    }
    let active = true;
    const check = async () => {
      if (!active) return;
      await refreshStatus();
    };
    const interval = window.setInterval(check, 3500);
    const onFocus = () => void check();
    const onVisibility = () => { if (document.visibilityState === "visible") void check(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    void check();
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshStatus]);

  async function activate() {
    setBusy(true);
    setNotice("");
    const response = await extensionRequest("ACTIVATE");
    if (response?.ok && response.status) {
      setExtension(response.status);
      setDetection(response.status.enabled ? "active" : "inactive");
      setNotice("J’IA est activée et connectée à Jobly sur cet ordinateur.");
    } else {
      setDetection("not-detected");
      setNotice("Je ne reçois pas encore de réponse de l’extension. Vérifie qu’elle est activée dans chrome://extensions, puis relance la vérification.");
    }
    setLastChecked(new Date());
    setBusy(false);
  }

  async function pause() {
    setBusy(true);
    setNotice("");
    const response = await extensionRequest("PAUSE");
    if (response?.ok && response.status) {
      setExtension(response.status);
      setDetection("inactive");
      setNotice("J’IA est en pause sur cet ordinateur. Tu peux la réactiver ici à tout moment.");
    } else {
      setNotice("La commande n’a pas abouti. Vérifie que l’extension est toujours active dans Chrome.");
    }
    setBusy(false);
  }

  const stateTitle = detection === "active" ? "Extension installée et activée"
    : detection === "inactive" ? "Extension installée, mais en pause"
    : detection === "checking" ? "Recherche de l’extension…"
    : detection === "error" ? "État impossible à confirmer"
    : "Extension non détectée";
  const stateDescription = detection === "active" ? "Jobly reçoit bien la réponse de J’IA. Le panneau peut être ouvert depuis l’icône de l’extension dans la barre d’outils."
    : detection === "inactive" ? "L’extension répond à Jobly, mais l’assistant est désactivé. Active-le pour utiliser l’aide pendant tes candidatures."
    : detection === "checking" ? "Jobly interroge localement l’extension dans ce navigateur."
    : detection === "error" ? "La connexion locale n’a pas répondu. Tu peux relancer le contrôle."
    : "Jobly ne reçoit aucune réponse. L’extension peut être absente ou désactivée dans Chrome.";
  const isDetected = detection === "active" || detection === "inactive";

  return (
    <main className="min-h-[100dvh] bg-[#F6F8FC] px-4 py-8 text-[#17212B] sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/jobs" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-[#22448B]">
          <ArrowLeft size={16}/> Retour aux offres
        </Link>

        <header className="mt-7 rounded-[30px] bg-[#142C52] p-6 text-white shadow-[0_20px_55px_rgba(20,44,82,.18)] sm:p-9">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#FFD60A] text-[#17212B]"><Sparkles size={24}/></div>
            <div><p className="text-[10px] font-black uppercase tracking-[1.5px] text-[#FFD60A]">Jobly · J’IA sur ordinateur</p><p className="mt-1 text-xs text-blue-100">Installation et activation guidées</p></div>
          </div>
          <h1 className="mt-6 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">J’IA t’accompagne aussi pendant tes candidatures sur ordinateur.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">Installe l’extension bêta, active l’assistant et laisse Jobly vérifier automatiquement que la connexion fonctionne.</p>
        </header>

        <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2"><Laptop size={19} className="text-[#22448B]"/><h2 className="text-base font-black">1. Vérification automatique</h2></div>
            <span className={"rounded-full px-3 py-1.5 text-[11px] font-black " + (browser.supported ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>{browser.supported ? "Navigateur compatible" : "Compatibilité à vérifier"}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{browser.reason} {browser.version ? "Version détectée : " + browser.version + "." : ""}</p>
          <div className={"mt-4 rounded-2xl border p-4 " + (detection === "active" ? "border-emerald-200 bg-emerald-50" : detection === "inactive" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50")}>
            <div className="flex items-start gap-3">
              {detection === "checking" ? <LoaderCircle className="mt-0.5 animate-spin text-[#22448B]" size={20}/> : detection === "active" ? <CheckCircle2 className="mt-0.5 text-emerald-600" size={20}/> : detection === "inactive" ? <PauseCircle className="mt-0.5 text-amber-700" size={20}/> : <CircleAlert className="mt-0.5 text-amber-700" size={20}/>}
              <div className="min-w-0 flex-1">
                <p className="font-black">{stateTitle}</p>
                <p className="mt-1 text-sm leading-5 text-slate-600">{stateDescription}</p>
                {extension && <p className="mt-2 text-[11px] font-semibold text-slate-500">Version {extension.version} · panneau latéral {extension.sidePanelAvailable ? "disponible" : "non disponible"}</p>}
                {lastChecked && <p className="mt-1 text-[10px] text-slate-400">Dernière vérification : {lastChecked.toLocaleTimeString("fr-FR")}</p>}
              </div>
              <button type="button" onClick={() => void refreshStatus()} title="Vérifier maintenant" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-[#22448B]"><RefreshCw size={15}/></button>
            </div>
            {detection === "inactive" && <button type="button" onClick={() => void activate()} disabled={busy} className="mt-4 min-h-11 w-full rounded-xl bg-[#FFD60A] px-4 text-sm font-black text-[#17212B] disabled:opacity-50">{busy ? "Activation…" : "Activer J’IA"}</button>}
            {detection === "active" && <button type="button" onClick={() => void pause()} disabled={busy} className="mt-4 min-h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-600 disabled:opacity-50">{busy ? "Mise en pause…" : "Mettre J’IA en pause"}</button>}
            {notice && <p role="status" className="mt-3 text-xs font-semibold text-slate-600">{notice}</p>}
          </div>
        </section>

        {browser.supported && detection !== "active" && (
          <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2"><Download size={19} className="text-[#22448B]"/><h2 className="text-base font-black">2. Installer l’extension bêta</h2></div>
            <p className="mt-2 text-sm leading-6 text-slate-600">L’extension n’est pas encore publiée dans le Chrome Web Store. Cette version bêta s’installe depuis un paquet Jobly, avec le mode développeur de Chrome.</p>
            <a href="/api/jia/extension/download" className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FFD60A] px-4 text-sm font-black text-[#17212B]"><Download size={17}/> Télécharger l’extension J’IA (ZIP)</a>
            <ol className="mt-5 space-y-3">
              <li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EEF3FA] text-xs font-black text-[#22448B]">1</span><div><p className="text-sm font-extrabold">Extraire le fichier ZIP</p><p className="mt-0.5 text-xs leading-5 text-slate-500">Décompresse le dossier téléchargé dans un emplacement que tu ne déplaceras pas.</p></div></li>
              <li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EEF3FA] text-xs font-black text-[#22448B]">2</span><div><p className="text-sm font-extrabold">Ouvrir la gestion des extensions</p><p className="mt-0.5 text-xs leading-5 text-slate-500">Dans un nouvel onglet, saisis chrome://extensions, puis active « Mode développeur ».</p></div></li>
              <li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EEF3FA] text-xs font-black text-[#22448B]">3</span><div><p className="text-sm font-extrabold">Charger l’extension</p><p className="mt-0.5 text-xs leading-5 text-slate-500">Clique sur « Charger l’extension non empaquetée » et sélectionne le dossier extrait qui contient manifest.json.</p></div></li>
              <li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#EEF3FA] text-xs font-black text-[#22448B]">4</span><div><p className="text-sm font-extrabold">Revenir sur Jobly</p><p className="mt-0.5 text-xs leading-5 text-slate-500">Cette page vérifie automatiquement l’installation toutes les quelques secondes. Pas besoin de saisir un code ou de copier un identifiant.</p></div></li>
            </ol>
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">Une extension chargée en mode développeur est une version bêta. N’installe jamais un paquet provenant d’une source que tu ne reconnais pas.</p>
          </section>
        )}

        {browser.supported && isDetected && detection !== "active" && (
          <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2"><Zap size={19} className="text-[#22448B]"/><h2 className="text-base font-black">3. Activer J’IA</h2></div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Jobly a détecté l’extension. Tu peux maintenant activer J’IA ; l’état sera mis à jour automatiquement dans cette page.</p>
            <button type="button" onClick={() => void activate()} disabled={busy} className="mt-4 min-h-12 w-full rounded-xl bg-[#FFD60A] px-4 text-sm font-black text-[#17212B] disabled:opacity-50">{busy ? "Activation…" : "Activer J’IA sur cet ordinateur"}</button>
          </section>
        )}

        {detection === "active" && (
          <section className="mt-5 rounded-[24px] border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2"><ShieldCheck size={21} className="text-emerald-600"/><h2 className="text-base font-black">J’IA est prête sur cet ordinateur</h2></div>
            <p className="mt-2 text-sm leading-6 text-slate-600">Ouvre le panneau Jobly J’IA depuis l’icône de l’extension dans la barre d’outils de Chrome. Si tu ne vois pas l’icône, ouvre le menu Extensions et épingle Jobly J’IA.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800"><CheckCircle2 size={15} className="mb-1"/> Extension détectée</div>
              <div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800"><CheckCircle2 size={15} className="mb-1"/> Assistant activé</div>
            </div>
          </section>
        )}

        <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2"><LockKeyhole size={19} className="text-[#22448B]"/><h2 className="text-base font-black">Permissions et confidentialité</h2></div>
          <p className="mt-2 text-sm leading-6 text-slate-600">L’extension n’analyse aucun site de recruteur tant que tu ne demandes pas l’analyse. Chrome sollicite alors une autorisation pour ce domaine. Seuls les libellés, types et champs obligatoires sont lus ; pas les valeurs saisies, mots de passe, fichiers ou codes. J’IA prépare des propositions, mais tu remplis et envoies toi-même le formulaire.</p>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#22448B]"><Puzzle size={16}/> Chrome 116 ou supérieur · Ordinateur</div>
        </section>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <span>Version bêta 0.2.0 · Le parcours sera simplifié après publication dans le Chrome Web Store.</span>
          <Link href="/jia/share" className="font-bold text-[#22448B] hover:underline">Utiliser J’IA sur Android</Link>
        </footer>
      </div>
    </main>
  );
}

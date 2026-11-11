"use client";

/**
 * J’IA — présence intelligente, intégrée à l’interface (jamais au-dessus du contenu).
 *
 * Chaîne : CONTEXTE → INTENTION → MESSAGE → GESTE → POSITION → VOIX → ACTION
 *   • CONTEXTE  : route, préférences par écosystème, dernière action, langue FR/EN ;
 *   • INTENTION : commande vocale (mot-clé « J’IA ») ou proposition proactive (/api/jia/predict) ;
 *   • MESSAGE   : bulle canari (#FFE135 / bleu #0057B8, identité validée) ;
 *   • GESTE     : vocabulaire sémantique lib/jia/gestures.ts → mouvements du rig (JIA.tsx) ;
 *   • POSITION  : ancrée au-dessus de la BottomNav, déplaçable à la main uniquement ;
 *   • VOIX      : Web Speech (FR/EN), uniquement en mode Vocal ;
 *   • ACTION    : événements jobly:jia-command / jobly:jia-response + Brain serveur.
 *
 * Règles UX (refonte 21/09/2026) :
 *   – taille réduite (≈ 96–120 px) ; mode « bulle-visage » (launcher) pour libérer l’écran ;
 *   – elle ne bloque jamais : masquée pendant la saisie clavier, sous une modale, ou sur
 *     les écrans d’authentification / onboarding ; réductible et masquable par page ;
 *   – aucun mouvement aléatoire permanent : le rig ne joue un geste que sur une intention ;
 *   – la barrière financière (lib/jia/guard.ts) s’applique avant tout geste, voix ou action.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import type { JIAMove } from "./jia-avatar/JIA";
import type { JiaGesture } from "./WaterScene";
import { GESTURE_TO_MOVE } from "./jia-avatar/gestureMap";
import { GESTURES, type GestureId } from "@/lib/jia/gestures";
import { commandIntent, extractWakeCommand, isFinancialRequest } from "@/lib/jia/guard";
import { getSupabaseClient } from "../lib/supabase";
import { canWriteJiaConversation, mergeJiaConversationMessages } from "@/lib/jia/conversation-write-guard";
import { useI18n, type DictKey } from "@/lib/i18n";
import { decide as decideAutonomy, observe as observeAutonomy } from "@/lib/jia/autonomy";
import JiaConversationSurface, { type JiaConversationMessage } from "@/components/jia/JiaConversationSurface";
import JiaPresenceMark from "./JiaPresenceMark";
import {
  buildJiaAdaptiveQuestionBank,
  buildJiaPracticeQuestionnaire,
  detectJiaWorkspaceIntent,
  type JiaWorkspaceBlock,
  type JiaWorkspaceIntent,
  type JiaWorkspaceOffer,
} from "@/lib/jia/workspace";


type Ecosystem = "TALENT" | "RECRUITER" | "PARTNER" | "ADMIN";
type Bubble = { id: number; text: string; gesture?: JiaGesture; move?: JIAMove };
type Prefs = { enabled: boolean; mode: "text" | "voice"; proactive: boolean };

type RecognitionLike = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((event: any) => void) | null; onerror: ((event: any) => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void;
};
type RecognitionConstructor = new () => RecognitionLike;
declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
    jia?: { play: (gesture: GestureId, opts?: { message?: string; target?: string }) => void; stop: () => void };
  }
}

// Écrans où J’IA ne s’affiche jamais (auth, onboarding, pages publiques, scène dédiée).
const HIDDEN_ROUTES = [/^\/$/, /^\/ecosystem/, /^\/auth\//, /^\/onboarding/, /^\/legal\//, /^\/cv\/share\//, /^\/pass\//, /^\/download/, /^\/join/, /^\/recruiter\/discover\//, /^\/admin\/login/, /^\/admin\/jia\/chat/];
// Écrans denses (formulaires, ATS, CV, paiement) : J’IA démarre en bulle-visage.
const COMPACT_ROUTES = [/^\/recruiter\/jobs\/new/, /^\/recruiter\/onboarding/, /^\/partner\/onboarding/, /^\/recruiter\/ats/, /^\/talent\/cvs/, /^\/abonnement/, /^\/partner\/(payment|kyc)/, /^\/recruiter\/settings/, /^\/talent\/settings/, /^\/partner\/settings/];
// Écrans sensibles : le texte visible n’est jamais transmis au modèle proactif.
const SENSITIVE_ROUTES = [/^\/abonnement/, /^\/partner\/(payment|kyc)/, /settings/, /reset-password/, /^\/talent\/cvs/, /^\/pass\//];

const COLLAPSE_KEY = "jobly-jia-collapsed";
const PREDICT_MIN_INTERVAL = 30_000;

function ecosystemOf(pathname: string): Ecosystem {
  if (pathname.startsWith("/admin")) return "ADMIN";
  if (pathname.startsWith("/recruiter")) return "RECRUITER";
  if (pathname.startsWith("/partner")) return "PARTNER";
  return "TALENT";
}

const CHIPS: Record<Ecosystem, { key: DictKey; href: string }[]> = {
  TALENT: [
    { key: "jia.panel.jobs", href: "/jobs" },
    { key: "jia.panel.careerOs", href: "/career-os" },
    { key: "jia.panel.applications", href: "/candidatures" },
  ],
  RECRUITER: [
    { key: "jia.panel.myJobs", href: "/recruiter/jobs" },
    { key: "jia.panel.candidates", href: "/recruiter/candidatures" },
    { key: "jia.panel.ats", href: "/recruiter/ats" },
  ],
  PARTNER: [
    { key: "jia.panel.dashboard", href: "/partner" },
    { key: "jia.panel.referral", href: "/partner/referral" },
    { key: "jia.panel.commissions", href: "/partner/payment" },
  ],
  ADMIN: [
    { key: "jia.panel.dashboard", href: "/admin" },
    { key: "jia.panel.ats", href: "/admin/jia" },
  ],
};
const SETTINGS_HREF: Record<Ecosystem, string> = { TALENT: "/talent/settings", RECRUITER: "/recruiter/settings", PARTNER: "/partner/settings", ADMIN: "/admin" };

async function loadJiaWorkspace(
  intent: JiaWorkspaceIntent,
  command: string,
  accessToken: string,
): Promise<JiaWorkspaceBlock | null> {
  if (!intent) return null;
  const headers = { Authorization: "Bearer " + accessToken };

  if (intent === "OFFERS") {
    const scope = /\bafrique\b/i.test(command) ? "&scope=africa" : "";
    const roleMatch = command.match(/\b(?:offre|emploi|poste)\s+(?:de|pour)\s+(.+?)(?:\s+(?:à|au|aux|en|dans|avec)\b|[?.!,]|$)/i);
    const query = roleMatch?.[1]?.trim().slice(0, 80);
    const search = query ? "&q=" + encodeURIComponent(query) : "";
    const response = await fetch("/api/jobs?limit=5" + scope + search, { headers, cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.message || "Le flux des offres est momentanément indisponible.");
    const jobs = Array.isArray(json.jobs) ? json.jobs : [];
    return {
      kind: "offers",
      totalAvailable: Number(json.totalAvailable) || 0,
      matchingCount: Number(json.matchingCount) || 0,
      offers: jobs.slice(0, 5).map((job: Record<string, any>) => ({
        id: String(job.id || ""),
        source: job.source === "recruiter" ? "recruiter" : "discovery",
        title: String(job.title || "Offre sans titre"),
        companyName: typeof job.company?.name === "string" ? job.company.name : null,
        location: typeof job.location === "string" ? job.location : null,
        contractType: typeof job.contractType === "string" ? job.contractType : null,
        remoteMode: typeof job.remoteMode === "string" ? job.remoteMode : null,
        matchPercent: Number.isFinite(Number(job.matchPercent)) ? Number(job.matchPercent) : null,
        deadline: typeof job.deadline === "string" ? job.deadline : null,
        sourceUrl: typeof job.sourceUrl === "string" ? job.sourceUrl : null,
        applicationReady: job.applicationReady === true,
      })).filter((job: JiaWorkspaceOffer) => Boolean(job.id)),
    };
  }

  if (intent === "APPLICATIONS") {
    const response = await fetch("/api/applications", { headers, cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.message || "Le suivi des candidatures est indisponible.");
    const applications = Array.isArray(json.applications) ? json.applications : [];
    return {
      kind: "applications",
      counters: {
        envoyees: Number(json.counters?.envoyees) || 0,
        vues: Number(json.counters?.vues) || 0,
        entretien: Number(json.counters?.entretien) || 0,
      },
      applications: applications.slice(0, 8).map((item: Record<string, any>) => ({
        id: String(item.id || ""),
        status: String(item.status || "UNKNOWN"),
        statusLabel: String(item.statusLabel || item.status || "À suivre"),
        createdAt: String(item.createdAt || ""),
        updatedAt: String(item.updatedAt || ""),
        job: item.job ? {
          title: String(item.job.title || "Offre"),
          companyName: typeof item.job.companyName === "string" ? item.job.companyName : null,
          location: typeof item.job.location === "string" ? item.job.location : null,
        } : null,
      })).filter((item: { id: string }) => Boolean(item.id)),
    };
  }

  if (intent === "RECRUITER_JOBS") {
    const response = await fetch("/api/recruiter/jobs", { headers, cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.message || "Les offres recruteur sont indisponibles.");
    const jobs = Array.isArray(json.jobs) ? json.jobs : [];
    return { kind: "business-summary", title: "Mes offres publiées et brouillons", metricLabel: "Offres", metric: jobs.length,
      items: jobs.slice(0, 8).map((job: Record<string, any>) => ({ id: String(job.id || ""), title: String(job.title || "Offre sans titre"), subtitle: [job.companyName, job.location].filter(Boolean).join(" · "), detail: [job.status, job.distributionScope, job.countryCode].filter(Boolean).join(" · "), status: String(job.status || "") })).filter((item: { id: string }) => Boolean(item.id)),
      href: "/recruiter/jobs", hrefLabel: "Gérer mes offres", note: "Données lues depuis les offres du compte recruteur connecté." };
  }
  if (intent === "RECRUITER_APPLICATIONS") {
    const response = await fetch("/api/recruiter/applications?markViewed=0", { headers, cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.message || "Les candidatures reçues sont indisponibles.");
    const rows = Array.isArray(json.applications) ? json.applications : [];
    return { kind: "business-summary", title: "Candidatures reçues", metricLabel: "Candidatures", metric: rows.length,
      items: rows.slice(0, 8).map((item: Record<string, any>) => ({ id: String(item.id || ""), title: String(item.candidateName || "Candidat"), subtitle: String(item.jobTitle || "Offre de l'entreprise"), detail: [item.status, item.viewedAt ? "Consultée" : "Non consultée"].filter(Boolean).join(" · "), status: String(item.status || "") })).filter((item: { id: string }) => Boolean(item.id)),
      href: "/recruiter/candidatures", hrefLabel: "Traiter les candidatures", note: "Lecture passive : cette carte ne modifie pas les statuts « Vu »." };
  }
  if (intent === "RECRUITER_TALENTS") {
    const response = await fetch("/api/recruiter/talents", { headers, cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.message || "Les profils Talent publics sont indisponibles.");
    const rows = Array.isArray(json.talents) ? json.talents : [];
    return { kind: "business-summary", title: "Talents publics découvrables", metricLabel: "Profils publics", metric: Number(json.count) || rows.length,
      items: rows.slice(0, 8).map((item: Record<string, any>) => ({ id: String(item.userId || ""), title: String(item.name || "Talent Jobly"), subtitle: [item.headline, item.location].filter(Boolean).join(" · "), detail: Array.isArray(item.topSkills) ? item.topSkills.map((skill: any) => String(skill.name || "")).filter(Boolean).slice(0, 4).join(" · ") : "", status: String(item.plan || "") })).filter((item: { id: string }) => Boolean(item.id)),
      href: "/recruiter/talents", hrefLabel: "Explorer les talents", note: "Profils ayant activé leur visibilité publique. Aucun contact privé n'est exposé." };
  }
  if (intent === "PARTNER_PROFILE") {
    const response = await fetch("/api/mobility/partner/me", { headers, cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.message || "Le dossier prestataire Mobility est indisponible.");
    const provider = json.provider || null, rows = Array.isArray(json.services) ? json.services : [];
    return { kind: "business-summary", title: "Mon espace partenaire Mobility", metricLabel: "Services", metric: rows.length,
      items: rows.slice(0, 8).map((item: Record<string, any>) => ({ id: String(item.id || ""), title: String(item.title || item.serviceType || "Service"), subtitle: [item.city, item.serviceType].filter(Boolean).join(" · "), detail: [item.status, item.currency && item.priceAmount != null ? String(item.priceAmount) + " " + item.currency : ""].filter(Boolean).join(" · "), status: String(item.status || "") })).filter((item: { id: string }) => Boolean(item.id)),
      href: "/partner", hrefLabel: "Ouvrir mon espace partenaire", note: provider ? "Dossier : " + String(provider.status || "PENDING_REVIEW") + " · KYC : " + String(provider.kycStatus || "PENDING") : "Aucun dossier prestataire enregistré. J’IA n'en crée pas automatiquement." };
  }
  if (intent === "PARTNER_ASSIGNMENTS") {
    const response = await fetch("/api/mobility/partner/assignments", { headers, cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.message || "Les affectations exigent un prestataire vérifié et actif.");
    const rows = Array.isArray(json.assignments) ? json.assignments : [];
    return { kind: "business-summary", title: "Mes affectations Mobility", metricLabel: "Affectations", metric: rows.length,
      items: rows.slice(0, 8).map((item: Record<string, any>) => ({ id: String(item.id || ""), title: String(item.MobilityProviderService?.title || "Mission Mobility"), subtitle: [item.MobilityRequest?.departCity, item.MobilityRequest?.arriveeCity].filter(Boolean).join(" → "), detail: [item.status, item.currency && item.agreedAmount != null ? String(item.agreedAmount) + " " + item.currency : ""].filter(Boolean).join(" · "), status: String(item.status || "") })).filter((item: { id: string }) => Boolean(item.id)),
      href: "/partner", hrefLabel: "Suivre mes missions", note: "Lecture seule : aucune affectation n'est modifiée depuis cette carte." };
  }
  if (intent === "PARTNER_COMMISSIONS") {
    const response = await fetch("/api/partner/commissions", { headers, cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.message || "Les commissions partenaires sont indisponibles.");
    const rows = Array.isArray(json.commissions) ? json.commissions : [], totals = json.totals || {};
    return { kind: "business-summary", title: "Mes commissions", metricLabel: "Commissions", metric: rows.length,
      items: rows.slice(0, 8).map((item: Record<string, any>) => ({ id: String(item.id || ""), title: String(item.description || item.type || "Commission"), subtitle: String(item.createdAt || ""), detail: [item.amount != null ? String(item.amount) + " " + String(item.currency || "XAF") : "", item.status].filter(Boolean).join(" · "), status: String(item.status || "") })).filter((item: { id: string }) => Boolean(item.id)),
      href: "/partner/payment", hrefLabel: "Voir le détail des paiements", note: ["À payer : " + String(totals.payable || 0), "En attente : " + String(totals.pending || 0), "Payé : " + String(totals.paid || 0)].join(" · ") + ". Montants fournis par Jobly." };
  }
  if (intent === "PARTNER_REPORTS") {
    const response = await fetch("/api/mobility/partner/reports?format=json", { headers, cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.message || "Les rapports Mobility ne sont pas accessibles.");
    const rows = Array.isArray(json.rows) ? json.rows : [];
    return { kind: "business-summary", title: "Rapport de suivi Mobility", metricLabel: "Dossiers visibles", metric: Number(json.count) || rows.length,
      items: rows.slice(0, 8).map((item: Record<string, any>) => ({ id: String(item.id || ""), title: [item.departCity, item.arriveeCity].filter(Boolean).join(" → ") || "Dossier mobilité", subtitle: String(item.status || ""), detail: [item.eligibilityStatus, item.costTotal != null ? String(item.costTotal) + " XAF" : ""].filter(Boolean).join(" · "), status: String(item.status || "") })).filter((item: { id: string }) => Boolean(item.id)),
      href: "/partner", hrefLabel: "Ouvrir mon espace partenaire", note: "Rapport limité aux dossiers reliés au compte par les règles Mobility." };
  }
  if (intent === "ADMIN_OVERVIEW") {
    const response = await fetch("/api/admin/jia/intelligence", { headers, cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.message || "L'intelligence transversale Admin est indisponible.");
    const rows = Array.isArray(json.layers) ? json.layers : [];
    return { kind: "business-summary", title: "Intelligence transversale Jobly", metricLabel: "Domaines analysés", metric: rows.length,
      items: rows.slice(0, 10).map((layer: Record<string, any>, index: number) => ({ id: String(layer.layer || layer.id || index), title: String(layer.title || layer.layer || "Domaine"), subtitle: String(layer.status || layer.health || ""), detail: String(layer.summary || layer.description || ""), status: String(layer.status || layer.health || "") })),
      href: "/admin/jia", hrefLabel: "Ouvrir le cockpit J’IA Admin", note: "Vue Admin séparée du Copilot CEO et de sa mémoire privée." };
  }

  if (intent === "PROFILE") {
    const response = await fetch("/api/profile", { headers, cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.message || "Le profil Talent est indisponible.");
    const user = json.user || {};
    const profile = json.profile || {};
    const skills = Array.isArray(json.skills) ? json.skills.map((skill: any) => String(skill?.name || "")).filter(Boolean) : [];
    return {
      kind: "profile",
      displayName: String(user.displayName || [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Profil Talent"),
      email: typeof user.email === "string" ? user.email : null,
      phone: typeof profile.phone === "string" ? profile.phone : typeof user.phone === "string" ? user.phone : null,
      location: typeof profile.location === "string" ? profile.location : null,
      headline: String(profile.headline || ""),
      summary: String(profile.summary || ""),
      skills,
      experiences: Array.isArray(json.experiences) ? json.experiences.slice(0, 5).map((item: any) => ({
        title: String(item?.title || ""),
        company: String(item?.company || ""),
        startDate: typeof item?.startDate === "string" ? item.startDate : null,
        endDate: typeof item?.endDate === "string" ? item.endDate : null,
        description: typeof item?.description === "string" ? item.description : null,
      })) : [],
      education: Array.isArray(json.education) ? json.education.slice(0, 4).map((item: any) => ({
        institution: String(item?.institution || ""),
        degree: typeof item?.degree === "string" ? item.degree : null,
        field: typeof item?.field === "string" ? item.field : null,
        startDate: typeof item?.startDate === "string" ? item.startDate : null,
        endDate: typeof item?.endDate === "string" ? item.endDate : null,
      })) : [],
      experienceCount: Array.isArray(json.experiences) ? json.experiences.length : 0,
      educationCount: Array.isArray(json.education) ? json.education.length : 0,
      cvOriginalUrl: typeof user.cvOriginalUrl === "string" ? user.cvOriginalUrl : null,
      cvOriginalFileName: typeof user.cvOriginalFileName === "string" ? user.cvOriginalFileName : null,
    };
  }

  if (intent !== "ASSESSMENT") return null;
  const bank = buildJiaAdaptiveQuestionBank(command);
  const createAssessment = async (adaptive: boolean, questions: typeof bank.questions) => {
    const response = await fetch("/api/career-journey/assessments", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        competency: bank.competency,
        title: bank.title,
        objective: bank.objective,
        format: "MCQ",
        adaptive,
        voiceAllowed: true,
        questions: questions.map((question) => ({ prompt: question.prompt, choices: question.choices })),
      }),
    });
    const json = await response.json().catch(() => ({}));
    return { response, json };
  };
  let created = await createAssessment(true, bank.questions);
  let adaptiveGranted = created.response.ok;
  if (!created.response.ok && created.response.status === 403 && created.json.requiredPlan === "PREMIUM") {
    created = await createAssessment(false, bank.questions.slice(0, 3));
  }
  if (!created.response.ok) throw new Error(created.json.message || "Je n'ai pas pu créer cet exercice.");
  const assessmentId = typeof created.json.assessment?.id === "string" ? created.json.assessment.id : "";
  if (!assessmentId) throw new Error("L'évaluation n'a pas reçu d'identifiant Jobly.");
  const questions = adaptiveGranted ? bank.questions : bank.questions.slice(0, 3);
  return {
    kind: "questionnaire",
    assessmentId,
    title: bank.title,
    competency: bank.competency,
    objective: adaptiveGranted
      ? bank.objective + " Le parcours Premium adapte la difficulté suivante selon tes réponses."
      : bank.objective + " Mode de pratique standard : trois questions.",
    questions,
    adaptive: adaptiveGranted,
    currentQuestionIndex: 0,
    currentDifficulty: 1,
    askedQuestionIndexes: adaptiveGranted ? [0] : [0, 1, 2],
    maxQuestions: adaptiveGranted ? 5 : 3,
  };
}


function speak(text: string, lang: "fr" | "en", onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "en" ? "en-US" : "fr-FR";
  u.rate = 0.94;
  u.pitch = 1.04;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
  // Certains navigateurs suspendent SpeechSynthesis après un changement de route.
  window.setTimeout(() => {
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  }, 80);
}

function isTypingTarget(el: Element | null) {
  if (!el || el.closest("[data-jia-panel]")) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable === true;
}

export default function JiaPresence() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { t, lang } = useI18n();
  const eco = ecosystemOf(pathname);

  const [signedIn, setSignedIn] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const sessionUserIdRef = useRef<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>({ enabled: true, mode: "text", proactive: true });
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [gesture, setGesture] = useState<JiaGesture>("welcome");
  const [move, setMove] = useState<JIAMove | undefined>(undefined);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedHere, setExpandedHere] = useState(false);
  const [hiddenPaths, setHiddenPaths] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [commandInput, setCommandInput] = useState("");
  const [commandBusy, setCommandBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; message: string; target?: string } | null>(null);
  const [sourceLinks, setSourceLinks] = useState<Array<{ title: string; url: string; snippet?: string }>>([]);
  const [healthStatus, setHealthStatus] = useState<"idle" | "checking" | "ready" | "error">("idle");
  const [recentDialogue, setRecentDialogue] = useState<string[]>([]);
  const [conversationMessages, setConversationMessages] = useState<JiaConversationMessage[]>([]);
  const conversationMessagesRef = useRef<JiaConversationMessage[]>([]);
  const [hasMoreConversationMessages, setHasMoreConversationMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [conversationPersistenceReady, setConversationPersistenceReady] = useState(false);

  const conversationIdRef = useRef<string | null>(null);
  const conversationOwnerUserIdRef = useRef<string | null>(null);
  const conversationWriteEpochRef = useRef(0);
  const pendingConversationMessagesRef = useRef<Array<{
    ecosystem: Ecosystem;
    ownerUserId: string;
    epoch: number;
    message: JiaConversationMessage;
  }>>([]);
  const conversationWriteQueueRef = useRef<Promise<void>>(Promise.resolve());

  const modeRef = useRef<"text" | "voice">("text");
  const langRef = useRef(lang);
  const enabledRef = useRef(true);
  const recognition = useRef<RecognitionLike | null>(null);
  const shouldRestart = useRef(true);
  const lastAction = useRef("");
  const lastPrediction = useRef("");
  const lastRequest = useRef(0);
  const externalSignalRef = useRef<{ summary: string; confidence: number; status: "CONFIRMED" | "LIKELY" | "CONTESTED" | "UNKNOWN" } | undefined>(undefined);
  const bubbleTimer = useRef<number | null>(null);
  const idSeq = useRef(0);
  const introSpoken = useRef(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const wasDragged = useRef(false);
  const tRef = useRef(t);
  const pathRef = useRef(pathname);

  tRef.current = t;
  pathRef.current = pathname;
  langRef.current = lang;
  enabledRef.current = prefs.enabled;

  const hiddenRoute = HIDDEN_ROUTES.some((r) => r.test(pathname));
  const compactRoute = COMPACT_ROUTES.some((r) => r.test(pathname));
  const sensitiveRoute = SENSITIVE_ROUTES.some((r) => r.test(pathname));
  const hiddenHere = hiddenPaths.includes(pathname);
  const showFigure = compactRoute ? expandedHere : !collapsed;
  const visible = signedIn && prefs.enabled && !hiddenRoute && !hiddenHere;
  const suspended = typing || dialogOpen;

  // ── Message / voix ────────────────────────────────────────────────────────
  const dismissBubble = useCallback(() => {
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = null;
    setBubble(null);
  }, []);

  const say = useCallback((text: string, opts?: { gesture?: JiaGesture; move?: JIAMove; speak?: boolean; sticky?: boolean }) => {
    if (!text) return;
    idSeq.current += 1;
    setBubble({ id: idSeq.current, text, gesture: opts?.gesture, move: opts?.move });
    if (opts?.gesture) setGesture(opts.gesture);
    setMove(opts?.move);
    if (opts?.move && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("jobly:jia-move", { detail: { move: opts.move, autonomous: true } }));
    }
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
    if (!opts?.sticky) bubbleTimer.current = window.setTimeout(() => setBubble(null), 12_000);
    if (opts?.speak !== false && modeRef.current === "voice") {
      setSpeaking(true);
      speak(text, langRef.current, () => setSpeaking(false));
    }
  }, []);

  // ── Session + préférences par écosystème ─────────────────────────────────
  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();
    const resetForIdentityChange = () => {
      conversationWriteEpochRef.current += 1;
      conversationIdRef.current = null;
      conversationOwnerUserIdRef.current = null;
      pendingConversationMessagesRef.current = [];
      conversationMessagesRef.current = [];
      conversationWriteQueueRef.current = Promise.resolve();
      setConversationMessages([]);
      setHasMoreConversationMessages(false);
      setLoadingOlderMessages(false);
      setConversationPersistenceReady(false);
      setRecentDialogue([]);
      setSourceLinks([]);
      setPendingAction(null);
      setCommandInput("");
      setCommandBusy(false);
      setPanelOpen(false);
      setBubble(null);
      setPrefs({ enabled: true, mode: "text", proactive: true });
      externalSignalRef.current = undefined;
      lastPrediction.current = "";
      lastAction.current = "";
      shouldRestart.current = false;
      recognition.current?.stop();
    };
    const applySession = (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
      const nextUserId = session?.user?.id ?? null;
      if (sessionUserIdRef.current !== nextUserId) resetForIdentityChange();
      sessionUserIdRef.current = nextUserId;
      setSignedIn(Boolean(session?.access_token));
      setSessionUserId(nextUserId);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      applySession(session);
    });
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        applySession(session);
        if (!session?.access_token) return;
        const res = await fetch(`/api/jia/preferences?ecosystem=${eco}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (!res.ok || !active) return;
        const data = await res.json();
        const mode = data.interaction_mode === "voice" ? "voice" : "text";
        modeRef.current = mode;
        setPrefs({ enabled: data.access_enabled !== false, mode, proactive: data.proactive_recommendations !== false });
        if (mode === "voice") {
          shouldRestart.current = true;
          window.setTimeout(() => startListening(), 250);
        } else {
          shouldRestart.current = false;
          recognition.current?.stop();
          recognition.current = null;
        }
      } catch { /* silence : pas d’état optimiste sur les préférences */ }
    })();
    return () => { active = false; subscription.unsubscribe(); };
  }, [pathname, eco, sessionUserId]);

  // Réduction persistée (préférence d’affichage locale).
  useEffect(() => { try { setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1"); } catch {} }, []);
  useEffect(() => {
    setPanelOpen(false);
    setExpandedHere(false);
    const pageGesture: JiaGesture = pathname.startsWith("/jobs") ? "curious" : pathname.startsWith("/candidatures") ? "reassure" : pathname.startsWith("/career") ? "analyze" : pathname.startsWith("/recruiter") ? "proud" : pathname.startsWith("/partner") ? "welcome" : "curious";
    setGesture(pageGesture);
    setMove(undefined);
  }, [pathname]);

  // ── Ne jamais gêner : saisie clavier, modales ouvertes ───────────────────
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => setTyping(isTypingTarget(e.target as Element | null));
    const onFocusOut = () => setTyping(false);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    let raf = 0;
    const check = () => { raf = 0; setDialogOpen(!!document.querySelector('[role="dialog"][aria-modal="true"]')); };
    const observer = new MutationObserver(() => { if (!raf) raf = window.requestAnimationFrame(check); });
    observer.observe(document.body, { childList: true, subtree: true });
    check();
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      observer.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  // ── Voix : reconnaissance + mot-clé « J’IA » ─────────────────────────────
  const startListening = useCallback(() => {
    if (typeof window === "undefined" || modeRef.current !== "voice" || !enabledRef.current) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setVoiceSupported(false); return; }
    if (recognition.current) return;
    const r = new Recognition();
    r.continuous = true;
    r.interimResults = false;
    r.lang = langRef.current === "en" ? "en-US" : "fr-FR";
    r.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript: string = result?.[0]?.transcript?.trim() || "";
      const command = extractWakeCommand(transcript);
      if (command === null) return; // pas de mot-clé : on ignore (jamais d’écoute « libre »)
      if (!command) { say(tRef.current("jia.reply.yes"), { gesture: "curious" }); return; }
      if (isFinancialRequest(command)) { say(tRef.current("jia.reply.payment"), { gesture: "secure" }); return; }
      const intent = commandIntent(command);
      window.dispatchEvent(new CustomEvent("jobly:jia-command", { detail: { command, intent } }));
      window.dispatchEvent(new CustomEvent("jobly:jia-transcript", { detail: { transcript, command, intent } }));
      void (async () => {
        try {
          const { data: { session } } = await getSupabaseClient().auth.getSession();
          if (!session?.access_token) return;
          const response = await fetch("/api/jia/brain", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ message: command, path: pathRef.current, action: intent, ecosystem: ecosystemOf(pathRef.current), lang: langRef.current }),
          });
          if (!response.ok) return;
          const out = await response.json();
          if (out.message) window.dispatchEvent(new CustomEvent("jobly:jia-response", { detail: { message: out.message, gesture: intent === "search_jobs" ? "analyze" : "reassure" } }));
        } catch { /* le Brain est optionnel : la commande locale a déjà ét������ émise */ }
      })();
      if (intent === "assistant_command") say(tRef.current("jia.reply.understood"), { gesture: "analyze" });
    };
    r.onerror = () => setListening(false);
    r.onend = () => {
      setListening(false);
      recognition.current = null;
      if (shouldRestart.current && modeRef.current === "voice" && enabledRef.current) window.setTimeout(startListening, 700);
    };
    recognition.current = r;
    shouldRestart.current = true;
    try { r.start(); setListening(true); } catch { setListening(false); }
  }, [say]);

  // La présence reste montée entre les routes : on relance seulement la reconnaissance vocale.
  useEffect(() => {
    if (recognition.current) {
      recognition.current.stop();
      recognition.current = null;
    }
    if (modeRef.current === "voice" && enabledRef.current) {
      shouldRestart.current = true;
      const timer = window.setTimeout(() => startListening(), 180);
      return () => window.clearTimeout(timer);
    }
  }, [lang, pathname, startListening]);

  useEffect(() => {
    const onInteract = () => {
      if (modeRef.current === "voice") startListening();
      if (!introSpoken.current && modeRef.current === "voice" && enabledRef.current) {
        introSpoken.current = true;
        window.setTimeout(() => speak(tRef.current("jia.intro"), langRef.current), 250);
      }
    };
    window.addEventListener("pointerdown", onInteract, { passive: true });
    window.addEventListener("keydown", onInteract, { passive: true });
    return () => {
      shouldRestart.current = false;
      recognition.current?.stop();
      recognition.current = null;
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, [startListening]);


  useEffect(() => {
    const onPreferencesChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: "text" | "voice"; enabled?: boolean; proactive?: boolean }>).detail;
      const mode = detail.mode === "voice" ? "voice" : "text";
      modeRef.current = mode;
      enabledRef.current = detail.enabled !== false;
      setPrefs((current) => ({ ...current, mode, enabled: detail.enabled !== false, proactive: detail.proactive !== false }));
      if (mode === "voice" && enabledRef.current) {
        shouldRestart.current = true;
        window.setTimeout(() => startListening(), 150);
      } else {
        shouldRestart.current = false;
        recognition.current?.stop();
        recognition.current = null;
        window.speechSynthesis?.cancel();
      }
    };
    window.addEventListener("jobly:jia-preferences-changed", onPreferencesChanged);
    return () => window.removeEventListener("jobly:jia-preferences-changed", onPreferencesChanged);
  }, [startListening]);

  const checkJiaHealth = useCallback(async () => {
    setHealthStatus("checking");
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const response = await fetch("/api/jia/health", {
        cache: "no-store",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      setHealthStatus(response.ok ? "ready" : "error");
    } catch {
      setHealthStatus("error");
    }
  }, []);

  const persistConversationMessage = useCallback((ecosystem: Ecosystem, message: JiaConversationMessage) => {
    if (!signedIn) return;
    const conversationId = conversationIdRef.current;
    const ownerUserId = conversationOwnerUserIdRef.current;
    const epoch = conversationWriteEpochRef.current;
    if (!conversationId || !ownerUserId) {
      const pendingOwner = sessionUserIdRef.current;
      if (pendingOwner) pendingConversationMessagesRef.current.push({ ecosystem, ownerUserId: pendingOwner, epoch, message });
      return;
    }
    conversationWriteQueueRef.current = conversationWriteQueueRef.current.then(async () => {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session || !canWriteJiaConversation({
        accessToken: session.access_token,
        sessionUserId: session.user.id,
        ownerUserId,
        currentOwnerUserId: conversationOwnerUserIdRef.current,
        currentConversationId: conversationIdRef.current,
        capturedConversationId: conversationId,
        currentEpoch: conversationWriteEpochRef.current,
        capturedEpoch: epoch,
      })) return;
      const response = await fetch("/api/jia/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({
          action: "append",
          conversationId,
          message: {
            id: message.id,
            role: message.role,
            text: message.text,
            sources: message.sources || [],
            workspace: message.workspace || null,
          },
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Sauvegarde du message impossible.");
    }).catch((error) => {
      // A rejected request from a prior account/session must not mark the new
      // account's conversation as disconnected.
      if (sessionUserIdRef.current !== ownerUserId || conversationWriteEpochRef.current !== epoch) return;
      setHealthStatus("error");
      console.error("[J’IA conversation] Persist failed", error);
    });
  }, [signedIn]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!signedIn) {
        conversationWriteEpochRef.current += 1;
        conversationIdRef.current = null;
        conversationOwnerUserIdRef.current = null;
        pendingConversationMessagesRef.current = [];
        conversationMessagesRef.current = [];
        conversationWriteQueueRef.current = Promise.resolve();
        setConversationPersistenceReady(false);
        setConversationMessages([]);
        setHasMoreConversationMessages(false);
        return;
      }
      conversationIdRef.current = null;
      setConversationPersistenceReady(false);
      setHealthStatus("checking");
      try {
        const { data: { session } } = await getSupabaseClient().auth.getSession();
        if (!session?.access_token || (sessionUserId && session.user.id !== sessionUserId)) throw new Error("Session requise.");
        if (conversationOwnerUserIdRef.current && conversationOwnerUserIdRef.current !== session.user.id) {
          conversationWriteEpochRef.current += 1;
          pendingConversationMessagesRef.current = [];
          conversationMessagesRef.current = [];
          conversationWriteQueueRef.current = Promise.resolve();
          setConversationMessages([]);
          setHasMoreConversationMessages(false);
        }
        conversationOwnerUserIdRef.current = session.user.id;
        const headers = { Authorization: "Bearer " + session.access_token };
        const contextResponse = await fetch("/api/jia/context?ecosystem=" + encodeURIComponent(eco), { headers, cache: "no-store" });
        const contextBody = await contextResponse.json().catch(() => ({}));
        if (!contextResponse.ok) throw new Error(contextBody.message || "Accès à cet espace J’IA refusé.");
        const response = await fetch("/api/jia/conversations?ecosystem=" + encodeURIComponent(eco) + "&limit=50", { headers, cache: "no-store" });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || "Restauration de la conversation impossible.");
        let conversation = body.conversation;
        if (!conversation?.id) {
          const createResponse = await fetch("/api/jia/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
            body: JSON.stringify({ action: "create", ecosystem: eco }),
          });
          const createBody = await createResponse.json().catch(() => ({}));
          if (!createResponse.ok || !createBody.conversation?.id) {
            throw new Error(createBody.message || "Création de la conversation impossible.");
          }
          conversation = createBody.conversation;
        }
        if (!active) return;
        conversationIdRef.current = String(conversation.id);
        const restored: JiaConversationMessage[] = (Array.isArray(body.messages) ? body.messages : []).map((item: Record<string, any>) => ({
          id: String(item.id),
          role: item.role === "user" ? "user" : "assistant",
          text: String(item.content || ""),
          createdAt: new Date(item.createdAt).getTime(),
          ...(Array.isArray(item.sources) && item.sources.length ? { sources: item.sources } : {}),
          ...(item.workspace && typeof item.workspace === "object" ? { workspace: item.workspace as JiaWorkspaceBlock } : {}),
        }));
        const restoreEpoch = conversationWriteEpochRef.current;
        const pending = pendingConversationMessagesRef.current;
        const readyForThisEcosystem = pending.filter((queued) =>
          queued.ecosystem === eco && queued.ownerUserId === session.user.id && queued.epoch === restoreEpoch
        );
        // Drop stale queue entries for this ecosystem; keep pending messages for
        // other tabs/routes until their own conversation has finished restoring.
        pendingConversationMessagesRef.current = pending.filter((queued) => queued.ecosystem !== eco);
        const merged = mergeJiaConversationMessages(
          restored,
          readyForThisEcosystem.map((queued) => queued.message),
        );
        conversationMessagesRef.current = merged;
        setConversationMessages(merged);
        setHasMoreConversationMessages(body.hasMore === true);
        setConversationPersistenceReady(true);
        setHealthStatus("ready");
        // Persist only after the local thread has been reconciled with the
        // server page, so messages sent during restore are never hidden or lost.
        for (const queued of readyForThisEcosystem) {
          persistConversationMessage(queued.ecosystem, queued.message);
        }
      } catch (error) {
        if (!active) return;
        setHealthStatus("error");
        setConversationPersistenceReady(false);
        console.error("[J’IA conversation] Restore failed", error);
      }
    })();
    return () => { active = false; };
  }, [eco, signedIn, sessionUserId, persistConversationMessage]);

  useEffect(() => { conversationMessagesRef.current = conversationMessages; }, [conversationMessages]);

  const appendConversationMessage = useCallback((role: "user" | "assistant", text: string, sources?: JiaConversationMessage["sources"], workspace?: JiaWorkspaceBlock) => {
    const normalized = text.trim();
    if (!normalized) return;
    idSeq.current += 1;
    const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `jia-${Date.now()}-${idSeq.current}`;
    const message: JiaConversationMessage = {
      id,
      role,
      text: normalized,
      createdAt: Date.now(),
      ...(sources?.length ? { sources } : {}),
      ...(workspace ? { workspace } : {}),
    };
    const nextMessages = [...conversationMessagesRef.current, message];
    conversationMessagesRef.current = nextMessages;
    setConversationMessages(nextMessages);
    persistConversationMessage(eco, message);
  }, [eco, persistConversationMessage]);

  useEffect(() => {
    const onTranscript = (event: Event) => {
      const detail = (event as CustomEvent<{ command?: string; transcript?: string }>).detail;
      const text = typeof detail?.command === "string" && detail.command.trim()
        ? detail.command.trim()
        : typeof detail?.transcript === "string" ? detail.transcript.trim() : "";
      if (text) appendConversationMessage("user", text);
    };
    window.addEventListener("jobly:jia-transcript", onTranscript);
    return () => window.removeEventListener("jobly:jia-transcript", onTranscript);
  }, [appendConversationMessage]);

  const sendTextCommand = useCallback(async () => {
    const command = commandInput.trim();
    if (!command || commandBusy) return;
    const initiatingOwner = sessionUserIdRef.current;
    const initiatingEpoch = conversationWriteEpochRef.current;
    appendConversationMessage("user", command);
    setCommandBusy(true);
    setCommandInput("");
    try {
      if (!initiatingOwner || !signedIn) throw new Error("Session requise.");
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session?.access_token || session.user.id !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return;
      const response = await fetch("/api/jia/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          message: command,
          path: pathRef.current,
          ecosystem: ecosystemOf(pathRef.current),
          lang: langRef.current,
          recentDialogue: recentDialogue.slice(-6),
        }),
      });
      const out = await response.json().catch(() => ({}));
      if (sessionUserIdRef.current !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return;
      if (!response.ok) throw new Error(out.message || "J’IA est momentanément indisponible.");
      const nextSources = Array.isArray(out.sources) ? out.sources.filter((source: unknown): source is { title: string; url: string; snippet?: string } => Boolean(source && typeof source === "object" && "url" in source && typeof source.url === "string" && /^https?:\/\//i.test(source.url))).slice(0, 5) : [];
      const workspaceIntent = detectJiaWorkspaceIntent(command, eco);
      let workspaceBlock: JiaWorkspaceBlock | null = null;
      if (workspaceIntent) {
        try {
          workspaceBlock = await loadJiaWorkspace(workspaceIntent, command, session.access_token);
        } catch (workspaceError) {
          workspaceBlock = {
            kind: "notice",
            title: "Espace Jobly non disponible",
            message: workspaceError instanceof Error ? workspaceError.message : "Le service Jobly demandé n'a pas répondu.",
            href: workspaceIntent === "OFFERS" ? "/jobs" : workspaceIntent === "APPLICATIONS" ? "/candidatures" : workspaceIntent === "PROFILE" ? "/talent/profile" : "/career-journey",
          };
        }
      }
      // A sign-out or account switch during a workspace fetch invalidates the
      // entire response; never attach an earlier account's content to the new thread.
      if (sessionUserIdRef.current !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return;
      setSourceLinks(nextSources);
      const answer = typeof out.message === "string" ? out.message.trim() : "";
      const previousAnswer = recentDialogue[recentDialogue.length - 1]?.trim().toLocaleLowerCase();
      if (answer && answer.toLocaleLowerCase() === previousAnswer) {
        throw new Error("J’IA a produit une réponse répétée ; nouvelle réponse demandée.");
      }
      setRecentDialogue((history) => [...history, command, answer].filter(Boolean).slice(-12));
      const proposedType = out.proposedAction?.type as string | undefined;
      appendConversationMessage("assistant", out.message || "Je suis prête à t’aider.", nextSources, workspaceBlock || undefined);
      const sourceSuffix = nextSources.length
        ? `\n\nSources vérifiables : ${nextSources.slice(0, 3).map((source: { title: string; url: string }) => source.title || source.url).join(" · ")}`
        : "";
      if (proposedType) setPendingAction({ type: proposedType, message: command, target: out.proposedAction?.target });
      say(`${out.message || "Je suis prête à t’aider."}${sourceSuffix}`, {
        gesture: proposedType ? "analyze" : "reassure",
        move: out.proposedAction ? "point_button" : undefined,
        speak: true,
        sticky: true,
      });
    } catch (error) {
      if (!initiatingOwner || sessionUserIdRef.current !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return;
      const message = error instanceof Error ? error.message : "Je n’ai pas réussi à répondre.";
      appendConversationMessage("assistant", message);
      say(message, { gesture: "secure", sticky: true, speak: false });
    } finally {
      setCommandBusy(false);
    }
  }, [appendConversationMessage, commandBusy, commandInput, eco, recentDialogue, say, signedIn]);


  const updateJiaWorkspace = useCallback((messageId: string, workspace: JiaWorkspaceBlock) => {
    const nextMessages = conversationMessagesRef.current.map((message) =>
      message.id === messageId && message.role === "assistant" ? { ...message, workspace } : message
    );
    conversationMessagesRef.current = nextMessages;
    setConversationMessages(nextMessages);
    const conversationId = conversationIdRef.current;
    const ownerUserId = conversationOwnerUserIdRef.current;
    const epoch = conversationWriteEpochRef.current;
    if (!conversationId || !ownerUserId) {
      const pendingOwner = sessionUserIdRef.current;
      if (pendingOwner) {
        pendingConversationMessagesRef.current = pendingConversationMessagesRef.current.map((queued) =>
          queued.ecosystem === eco && queued.ownerUserId === pendingOwner && queued.message.id === messageId
            ? { ...queued, message: { ...queued.message, workspace } }
            : queued
        );
      }
      return;
    }
    conversationWriteQueueRef.current = conversationWriteQueueRef.current.then(async () => {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session || !canWriteJiaConversation({
        accessToken: session.access_token,
        sessionUserId: session.user.id,
        ownerUserId,
        currentOwnerUserId: conversationOwnerUserIdRef.current,
        currentConversationId: conversationIdRef.current,
        capturedConversationId: conversationId,
        currentEpoch: conversationWriteEpochRef.current,
        capturedEpoch: epoch,
      })) return;
      const response = await fetch("/api/jia/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ action: "update-workspace", conversationId, messageId, workspace }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Sauvegarde de la carte impossible.");
    }).catch((error) => {
      if (sessionUserIdRef.current !== ownerUserId || conversationWriteEpochRef.current !== epoch) return;
      setHealthStatus("error");
      console.error("[J’IA conversation] Workspace state persist failed", error);
    });
  }, []);

  const saveJiaProfile = useCallback(async (args: {
    messageId: string;
    displayName: string;
    phone: string;
    headline: string;
    summary: string;
    location: string;
    skills: string[];
  }) => {
    const initiatingOwner = sessionUserIdRef.current;
    const initiatingEpoch = conversationWriteEpochRef.current;
    setCommandBusy(true);
    try {
      if (!initiatingOwner) throw new Error("Session requise pour modifier le profil.");
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session?.access_token || session.user.id !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return;
      const headers = { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token };
      const profileResponse = await fetch("/api/profile", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          section: "profil",
          displayName: args.displayName,
          phone: args.phone,
          headline: args.headline,
          summary: args.summary,
          location: args.location,
        }),
      });
      const profileBody = await profileResponse.json().catch(() => ({}));
      if (!profileResponse.ok) throw new Error(profileBody.message || "Jobly n'a pas enregistré les informations du profil.");
      if (sessionUserIdRef.current !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return;

      const skillsResponse = await fetch("/api/profile", {
        method: "PUT",
        headers,
        body: JSON.stringify({ section: "skills", skills: args.skills.map((name) => ({ name })) }),
      });
      const skillsBody = await skillsResponse.json().catch(() => ({}));
      if (!skillsResponse.ok) throw new Error(skillsBody.message || "Les compétences n'ont pas été enregistrées.");
      if (sessionUserIdRef.current !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return;

      const message = conversationMessagesRef.current?.find((item) => item.id === args.messageId);
      if (message?.workspace?.kind === "profile") {
        updateJiaWorkspace(args.messageId, {
          ...message.workspace,
          displayName: args.displayName,
          phone: args.phone || null,
          headline: args.headline,
          summary: args.summary,
          location: args.location || null,
          skills: args.skills,
        });
      }
    } finally {
      setCommandBusy(false);
    }
  }, [updateJiaWorkspace]);

  const uploadJiaCv = useCallback(async (args: { messageId: string; file: File }): Promise<boolean> => {
    const initiatingOwner = sessionUserIdRef.current;
    const initiatingEpoch = conversationWriteEpochRef.current;
    const { file } = args;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      throw new Error("Le CV doit être un fichier PDF.");
    }
    if (file.size <= 0 || file.size > 3 * 1024 * 1024) {
      throw new Error("Le CV original doit peser entre 1 octet et 3 Mo.");
    }
    if (!window.confirm("Remplacer le CV original enregistré dans Jobly ? Le nouveau PDF deviendra le document de référence de ton profil.")) {
      return false;
    }
    setCommandBusy(true);
    try {
      if (!initiatingOwner) throw new Error("Session requise pour remplacer le CV.");
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session?.access_token || session.user.id !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return false;
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/talent/cv/original", {
        method: "POST",
        headers: { Authorization: "Bearer " + session.access_token },
        body: form,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body.stored !== true) throw new Error(body.message || "Jobly n'a pas confirmé l'enregistrement du CV.");
      if (sessionUserIdRef.current !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return false;

      const profileResponse = await fetch("/api/profile", {
        headers: { Authorization: "Bearer " + session.access_token },
        cache: "no-store",
      });
      const profileBody = profileResponse.ok ? await profileResponse.json().catch(() => ({})) : {};
      if (sessionUserIdRef.current !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return false;
      const refreshedUser = profileBody.user || {};
      const message = conversationMessagesRef.current.find((item) => item.id === args.messageId);
      if (message?.workspace?.kind === "profile") {
        updateJiaWorkspace(args.messageId, {
          ...message.workspace,
          cvOriginalFileName: typeof refreshedUser.cvOriginalFileName === "string" ? refreshedUser.cvOriginalFileName : (body.fileName || file.name),
          cvOriginalUrl: typeof refreshedUser.cvOriginalUrl === "string" ? refreshedUser.cvOriginalUrl : null,
        });
      }
      return true;
    } finally {
      setCommandBusy(false);
    }
  }, [updateJiaWorkspace]);

  const loadOlderConversationMessages = useCallback(async () => {
    const capturedConversationId = conversationIdRef.current;
    const capturedOwner = conversationOwnerUserIdRef.current;
    const capturedEpoch = conversationWriteEpochRef.current;
    const currentMessages = conversationMessagesRef.current;
    if (loadingOlderMessages || !hasMoreConversationMessages || !capturedConversationId || !capturedOwner || !currentMessages.length) return;
    setLoadingOlderMessages(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session || !canWriteJiaConversation({
        accessToken: session.access_token,
        sessionUserId: session.user.id,
        ownerUserId: capturedOwner,
        currentOwnerUserId: conversationOwnerUserIdRef.current,
        currentConversationId: conversationIdRef.current,
        capturedConversationId,
        currentEpoch: conversationWriteEpochRef.current,
        capturedEpoch,
      })) return;
      const oldest = currentMessages[0];
      const query = new URLSearchParams({
        ecosystem: eco,
        conversationId: capturedConversationId,
        before: new Date(oldest.createdAt).toISOString(),
        beforeId: oldest.id,
        limit: "50",
      });
      const response = await fetch("/api/jia/conversations?" + query.toString(), {
        headers: { Authorization: "Bearer " + session.access_token },
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Historique précédent indisponible.");
      const { data: { session: currentSession } } = await getSupabaseClient().auth.getSession();
      if (!currentSession || !canWriteJiaConversation({
        accessToken: currentSession.access_token,
        sessionUserId: currentSession.user.id,
        ownerUserId: capturedOwner,
        currentOwnerUserId: conversationOwnerUserIdRef.current,
        currentConversationId: conversationIdRef.current,
        capturedConversationId,
        currentEpoch: conversationWriteEpochRef.current,
        capturedEpoch,
      })) return;
      const older: JiaConversationMessage[] = (Array.isArray(body.messages) ? body.messages : []).map((item: Record<string, any>) => ({
        id: String(item.id),
        role: item.role === "user" ? "user" : "assistant",
        text: String(item.content || ""),
        createdAt: new Date(item.createdAt).getTime(),
        ...(Array.isArray(item.sources) && item.sources.length ? { sources: item.sources } : {}),
        ...(item.workspace && typeof item.workspace === "object" ? { workspace: item.workspace as JiaWorkspaceBlock } : {}),
      }));
      const nextMessages = mergeJiaConversationMessages(older, conversationMessagesRef.current);
      conversationMessagesRef.current = nextMessages;
      setConversationMessages(nextMessages);
      setHasMoreConversationMessages(body.hasMore === true);
    } catch (error) {
      if (sessionUserIdRef.current !== capturedOwner || conversationWriteEpochRef.current !== capturedEpoch) return;
      setHealthStatus("error");
      console.error("[J’IA conversation] Older page load failed", error);
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [eco, hasMoreConversationMessages, loadingOlderMessages]);

  const prepareJiaApplication = useCallback(async (offer: JiaWorkspaceOffer) => {
    const initiatingOwner = sessionUserIdRef.current;
    const initiatingEpoch = conversationWriteEpochRef.current;
    setCommandBusy(true);
    try {
      if (!initiatingOwner) throw new Error("Session requise pour préparer une candidature.");
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session?.access_token || session.user.id !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return;
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ source: offer.source, jobId: offer.id, locale: langRef.current === "en" ? "en" : "fr" }),
      });
      const result = await response.json().catch(() => ({}));
      if (sessionUserIdRef.current !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return;
      if (!response.ok) throw new Error(result.message || "Jobly n'a pas pu préparer cette candidature.");
      const prepared = result.prepared || {};
      const applicationProfile = result.applicationProfile || {};
      const block: JiaWorkspaceBlock = {
        kind: "prepared-application",
        applicationId: String(result.application?.id || ""),
        title: offer.title,
        channel: String(prepared.channel?.channel || "À confirmer"),
        subject: String(prepared.subject || ""),
        letter: String(prepared.letter || ""),
        email: typeof applicationProfile.applicationEmail === "string" ? applicationProfile.applicationEmail : null,
        phone: typeof applicationProfile.applicationPhone === "string" ? applicationProfile.applicationPhone : null,
        warnings: Array.isArray(prepared.warnings) ? prepared.warnings.filter((item: unknown): item is string => typeof item === "string") : [],
        sourceUrl: offer.sourceUrl,
      };
      appendConversationMessage(
        "assistant",
        "La candidature pour « " + offer.title + " » a été préparée dans Jobly. Relis le contenu et vérifie le canal ci-dessous : rien n'a été envoyé automatiquement.",
        undefined,
        block,
      );
      say("Ta candidature est préparée et reste sous ton contrôle. Elle n'a pas été envoyée.", { gesture: "welcome", speak: true, sticky: true });
    } catch (error) {
      if (!initiatingOwner || sessionUserIdRef.current !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return;
      const message = error instanceof Error ? error.message : "Impossible de préparer cette candidature.";
      appendConversationMessage("assistant", message);
      say(message, { gesture: "secure", speak: false, sticky: true });
    } finally {
      setCommandBusy(false);
    }
  }, [appendConversationMessage, say]);

  const submitJiaApplication = useCallback(async (args: {
    messageId: string;
    applicationId: string;
    letter: string;
  }) => {
    if (!args.applicationId) throw new Error("Identifiant de candidature absent.");
    const initiatingOwner = sessionUserIdRef.current;
    const initiatingEpoch = conversationWriteEpochRef.current;
    setCommandBusy(true);
    try {
      if (!initiatingOwner) throw new Error("Session requise pour envoyer cette candidature.");
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session?.access_token || session.user.id !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return;
      const response = await fetch("/api/applications/" + encodeURIComponent(args.applicationId) + "/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ letterText: args.letter }),
      });
      const result = await response.json().catch(() => ({}));
      if (sessionUserIdRef.current !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return;
      if (!response.ok || result.submitted !== true) {
        throw new Error(result.message || "Jobly n’a pas confirmé l’envoi de cette candidature.");
      }
      const applicationMessage = conversationMessagesRef.current.find((message) => message.id === args.messageId);
      if (applicationMessage?.workspace?.kind === "prepared-application") {
        updateJiaWorkspace(args.messageId, { ...applicationMessage.workspace, submitted: true });
      }
      appendConversationMessage(
        "assistant",
        result.pendingProof
          ? "L’email est parti via Gmail. Jobly enregistre encore la preuve d’envoi ; le suivi reste à vérifier dans Mes candidatures."
          : "Jobly confirme l’envoi de ta candidature via Gmail. Tu peux suivre son statut dans Mes candidatures.",
      );
    } finally {
      setCommandBusy(false);
    }
  }, [appendConversationMessage]);

  const submitJiaAssessment = useCallback(async (args: {
    messageId: string;
    assessmentId: string;
    answers: Record<string, unknown>;
    score: number;
    resultSummary: string;
  }) => {
    const initiatingOwner = sessionUserIdRef.current;
    const initiatingEpoch = conversationWriteEpochRef.current;
    setCommandBusy(true);
    try {
      if (!initiatingOwner) throw new Error("Session requise pour enregistrer cet exercice.");
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session?.access_token || session.user.id !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return;
      const response = await fetch("/api/career-journey/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({
          action: "ATTEMPT",
          assessmentId: args.assessmentId,
          answers: args.answers,
          completed: true,
          feedback: { evaluated: "Auto-évaluation formative locale", limitation: "Le score indicatif est calculé dans l'interface et n'est pas enregistré comme une preuve évaluée par IA ni comme une certification." },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (sessionUserIdRef.current !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return;
      if (!response.ok) throw new Error(result.message || "L'enregistrement de l'évaluation a échoué.");
      const assessmentMessage = conversationMessagesRef.current.find((message) => message.id === args.messageId);
      if (assessmentMessage?.workspace?.kind === "questionnaire") {
        updateJiaWorkspace(args.messageId, { ...assessmentMessage.workspace, result: { score: args.score, summary: args.resultSummary } });
      }
      appendConversationMessage("assistant", "Ton exercice est enregistré dans Career Journey. Le résultat reste indicatif et ne vaut pas certification.");
    } finally {
      setCommandBusy(false);
    }
  }, [appendConversationMessage]);

  const confirmPendingAction = useCallback(async () => {
    if (!pendingAction) return;
    const initiatingOwner = sessionUserIdRef.current;
    const initiatingEpoch = conversationWriteEpochRef.current;
    const action = pendingAction;
    setCommandBusy(true);
    try {
      if (!initiatingOwner) throw new Error("Session requise pour confirmer cette action.");
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session?.access_token || session.user.id !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return;
      const response = await fetch("/api/jia/action", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ type: action.type, message: action.message, confirmed: true }),
      });
      const result = await response.json().catch(() => ({}));
      if (sessionUserIdRef.current !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return;
      if (!response.ok) throw new Error(result.message || "Action non disponible.");
      setPendingAction(null);
      const confirmation = typeof result.message === "string" && result.message.trim()
        ? result.message.trim()
        : "L’action a été acceptée par le service Jobly.";
      appendConversationMessage("assistant", confirmation);
      say(confirmation, { gesture: "welcome", speak: true, sticky: true });
      if (action.target || result.next) { setPanelOpen(false); router.push(action.target || result.next); }
    } catch (error) {
      if (!initiatingOwner || sessionUserIdRef.current !== initiatingOwner || conversationWriteEpochRef.current !== initiatingEpoch) return;
      say(error instanceof Error ? error.message : "Je n’ai pas pu préparer cette action.", { gesture: "secure", sticky: true, speak: false });
    } finally {
      setCommandBusy(false);
    }
  }, [appendConversationMessage, pendingAction, router, say]);

  // ── Candidature externe : ouvrir J'IA avec le contexte de l'offre ─────────
  useEffect(() => {
    const onApplicationAssist = (event: Event) => {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail || {};
      const prompt = typeof detail.prompt === "string" ? detail.prompt.trim().slice(0, 9000) : "";
      if (!prompt) return;
      setHiddenPaths((current) => current.filter((path) => path !== pathname));
      setCollapsed(false);
      setExpandedHere(true);
      setPanelOpen(true);
      setCommandInput(prompt);
      appendConversationMessage("assistant", "Le contexte de cette candidature externe est prêt. Vérifie les informations puis envoie ta demande pour préparer tes réponses.");
      say("J’ai préparé le contexte de cette candidature. Vérifie la demande dans mon panneau, puis envoie-la pour préparer tes réponses.", { gesture: "analyze", speak: false, sticky: true });
    };
    window.addEventListener("jobly:jia-application-assist", onApplicationAssist);
    return () => window.removeEventListener("jobly:jia-application-assist", onApplicationAssist);
  }, [appendConversationMessage, pathname, say]);

  useEffect(() => {
    window.dispatchEvent(new Event("jobly:jia-ready"));
  }, []);

  // ── Réponses externes, gestes sémantiques (window.jia.play) ──────────────
  useEffect(() => {
    const onResponse = (event: Event) => {
      const d = (event as CustomEvent<{ message?: string; gesture?: JiaGesture }>).detail;
      if (d?.message) {
        appendConversationMessage("assistant", d.message);
        say(d.message, { gesture: d.gesture || "reassure" });
      }
    };
    window.addEventListener("jobly:jia-response", onResponse);
    return () => window.removeEventListener("jobly:jia-response", onResponse);
  }, [appendConversationMessage, say]);

  useEffect(() => {
    const play = (id: GestureId, opts?: { message?: string; target?: string }) => {
      if (!enabledRef.current || !GESTURES[id]) return;
      const spec = GESTURES[id];
      const message = opts?.message ?? "";
      // Défense en profondeur : jamais de voix ni de geste « action » sur un sujet financier.
      const financial = message ? isFinancialRequest(message) : false;
      setTargetRect(null);
      if (opts?.target) {
        try { setTargetRect(document.querySelector(opts.target)?.getBoundingClientRect() ?? null); } catch { /* sélecteur invalide */ }
        window.setTimeout(() => setTargetRect(null), spec.duration + 600);
      }
      if (message) say(message, { move: GESTURE_TO_MOVE[id], speak: !financial });
      else setMove(GESTURE_TO_MOVE[id]);
    };
    const stop = () => { window.speechSynthesis?.cancel(); setSpeaking(false); dismissBubble(); setTargetRect(null); setMove(undefined); };
    window.jia = { play, stop };
    const onPlay = (e: Event) => { const d = (e as CustomEvent<{ gesture: GestureId; message?: string; target?: string }>).detail; if (d?.gesture) play(d.gesture, d); };
    window.addEventListener("jobly:jia-play", onPlay);
    return () => { window.removeEventListener("jobly:jia-play", onPlay); delete window.jia; };
  }, [say, dismissBubble]);

  // ── Autonomie locale : OBSERVER → ÉVALUER → DÉCIDER → AGIR ───────────────
  // Moteur gratuit : aucune API payante n’est nécessaire pour l’initiative de base.
  useEffect(() => {
    if (!visible || !prefs.proactive) return;
    let lastAutonomousAt = 0;
    const cycle = () => {
      if (document.hidden || suspended || panelOpen || bubble || Date.now() - lastAutonomousAt < 12_000) return;
      const text = document.body.innerText.slice(0, 5000);
      const percent = text.match(/(?:profil|profile)[^%]{0,80}(\d{1,3})\s*%/i)?.[1];
      const w = window as Window & { __jiaIdleMs?: number };
      const decision = decideAutonomy(observeAutonomy({
        path: pathname,
        lastAction: lastAction.current,
        idleMs: Math.min(300_000, w.__jiaIdleMs || 0),
        recentActions: [lastAction.current].filter(Boolean),
        profileCompletion: percent ? Math.min(100, Number(percent)) : undefined,
        matchingOffers: pathname.includes("/jobs") ? document.querySelectorAll('a[href*="/jobs/"]').length : 0,
        pendingApplications: pathname.includes("/candidatures") ? document.querySelectorAll('[data-application], a[href*="candidatures"]').length : 0,
        currentLanguage: langRef.current === "en" ? "en" : "fr",
        externalSignal: externalSignalRef.current,
      }));
      if (!decision) return;
      lastAutonomousAt = Date.now();
      say(decision.message[langRef.current === "en" ? "en" : "fr"], {
        gesture: decision.gesture,
        move: decision.move,
        speak: decision.speak,
      });
      window.dispatchEvent(new CustomEvent("jobly:jia-autonomous-decision", { detail: decision }));
    };
    const onActivity = () => { (window as Window & { __jiaIdleMs?: number }).__jiaIdleMs = 0; };
    const idleTimer = window.setInterval(() => {
      const w = window as Window & { __jiaIdleMs?: number };
      w.__jiaIdleMs = Math.min(300_000, (w.__jiaIdleMs || 0) + 1_000);
      cycle();
    }, 5_000);
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });
    cycle();
    return () => {
      window.clearInterval(idleTimer);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [visible, prefs.proactive, pathname, suspended, panelOpen, bubble, say]);

  // ── Cycle cognitif unifié : la présence UI alimente le même cerveau que le reste du produit ──
  useEffect(() => {
    if (!visible || !prefs.proactive || sensitiveRoute) return;
    let active = true;
    const runCycle = async () => {
      try {
        const { data: { session } } = await getSupabaseClient().auth.getSession();
        if (!session?.access_token || document.hidden || !active) return;
        const response = await fetch("/api/jia/cycle", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            ecosystem: ecosystemOf(pathname),
            path: pathRef.current,
            action: lastAction.current,
            includeInternet: false,
          }),
        });
        if (!response.ok || !active) return;
        const result = await response.json();
        window.dispatchEvent(new CustomEvent("jobly:jia-cognitive-cycle", { detail: result }));
        const recommendation = result?.recommendations?.[0];
        if (recommendation?.title && recommendation?.confidence !== "LOW") {
          externalSignalRef.current = undefined;
          say(recommendation.title, { gesture: "analyze", speak: false });
        }
      } catch {
        // Le cycle cognitif est opportuniste côté UI : l’autonomie offline reste indépendante.
      }
    };
    const initial = window.setTimeout(runCycle, 15_000);
    const interval = window.setInterval(runCycle, 300_000);
    return () => { active = false; window.clearTimeout(initial); window.clearInterval(interval); };
  }, [visible, prefs.proactive, pathname, sensitiveRoute, say]);

  // ── Internet Brain : perception externe proactive ───────────────────────
  useEffect(() => {
    if (!visible || !prefs.proactive || sensitiveRoute) return;
    if (!/\/jobs|\/career|\/recruiter|\/partner|\/candidatures/.test(pathname)) return;
    let active = true;
    const queryForRoute = () => {
      const action = lastAction.current.replace(/[^a-zA-ZÀ-ÿ0-9 _-]/g, " ").trim().slice(0, 100);
      if (pathname.startsWith("/recruiter")) return "recrutement emploi Cameroun " + action;
      if (pathname.startsWith("/partner")) return "partenariat emploi Cameroun " + action;
      if (pathname.includes("/career")) return "carrière compétences emploi Cameroun " + action;
      if (pathname.includes("/candidatures")) return "candidature recrutement emploi Cameroun " + action;
      return "offres emploi Cameroun " + action;
    };
    const requestExternalSignal = async () => {
      try {
        const { data: { session } } = await getSupabaseClient().auth.getSession();
        if (!session?.access_token || document.hidden || !active) return;
        const res = await fetch("/api/jia/internet", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ query: queryForRoute(), mode: "PROACTIVE", maxQueries: 1, maxSources: 5 }),
        });
        if (!res.ok || !active) return;
        const signal = await res.json() as {
          type?: string; proposal?: string;
          beliefCandidate?: { confidence?: number; status?: "CONFIRMED"|"LIKELY"|"CONTESTED"|"UNKNOWN"; belief?: string };
          observation?: { internetAvailable?: boolean; confidence?: number; status?: "CONFIRMED"|"LIKELY"|"CONTESTED"|"UNKNOWN"; facts?: string[]; sourcesUsed?: Array<{title?:string;url?:string}> };
        };
        window.dispatchEvent(new CustomEvent("jobly:jia-external-signal", { detail: signal }));
        const o = signal.observation;
        const confidence = signal.beliefCandidate?.confidence ?? o?.confidence ?? 0;
        const status = signal.beliefCandidate?.status ?? o?.status ?? "UNKNOWN";
        const summary = signal.beliefCandidate?.belief || o?.facts?.[0] || "";
        if (o?.internetAvailable && summary) {
          externalSignalRef.current = { summary: summary.slice(0, 280), confidence, status };
          try {
            const key = "jobly-jia-internet-memory-v1";
            const prior = JSON.parse(window.localStorage.getItem(key) || "[]") as Array<{summary:string;confidence:number;status:string;at:string}>;
            const next = [{summary:summary.slice(0,280),confidence,status,at:new Date().toISOString()},...prior].slice(0,50);
            window.localStorage.setItem(key, JSON.stringify(next));
          } catch {}
        }
      } catch { /* Internet Brain failure never stops offline autonomy. */ }
    };
    const timer = window.setTimeout(requestExternalSignal, 20_000);
    const interval = window.setInterval(requestExternalSignal, 300_000);
    return () => { active = false; window.clearTimeout(timer); window.clearInterval(interval); };
  }, [visible, prefs.proactive, pathname, sensitiveRoute]);

  // ── Proactivité (si autorisée) ───────────────────────���───────────────────
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const el = (event.target as HTMLElement | null)?.closest("button,a,[role=button],input,select,textarea") as HTMLElement | null;
      if (!el) return;
      const label = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || "").trim().replace(/\s+/g, " ").slice(0, 220);
      if (label) lastAction.current = label;
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!visible || !prefs.proactive) return;
    let timer: number | null = null;
    const request = async () => {
      const now = Date.now();
      if (now - lastRequest.current < PREDICT_MIN_INTERVAL || document.hidden) return;
      lastRequest.current = now;
      try {
        const { data: { session } } = await getSupabaseClient().auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch("/api/jia/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            path: pathname, action: lastAction.current, lang: langRef.current,
            visibleText: sensitiveRoute ? "" : document.body.innerText.slice(0, 1200),
            recentDialogue: lastPrediction.current ? [lastPrediction.current] : [], idleMs: 0,
          }),
        });
        if (!res.ok) return;
        const next = await res.json() as { message?: string; gesture?: string; shouldSpeak?: boolean };
        if (!next.message || next.message === lastPrediction.current) return;
        lastPrediction.current = next.message;
        say(next.message, { gesture: (next.gesture as JiaGesture) || "curious", speak: next.shouldSpeak === true });
      } catch { /* proactivité facultative */ }
    };
    const schedule = (delay: number) => { if (timer) window.clearTimeout(timer); timer = window.setTimeout(request, delay); };
    schedule(pathname === "/" ? 8_000 : 2_500);
    void checkJiaHealth();
    const interval = window.setInterval(request, PREDICT_MIN_INTERVAL);
    const onActivity = () => schedule(4_000);
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });
    return () => {
      if (timer) window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [checkJiaHealth, pathname, visible, prefs.proactive, sensitiveRoute, say]);

  useEffect(() => () => { if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current); }, []);
  useEffect(() => { if (!speaking) return; const id = window.setTimeout(() => setSpeaking(false), 30_000); return () => window.clearTimeout(id); }, [speaking]);

  // ── Actions UI ───────────────────────────────────────────────────────────
  function minimize() {
    setPanelOpen(false);
    dismissBubble();
    if (compactRoute) { setExpandedHere(false); return; }
    setCollapsed(true);
    try { window.localStorage.setItem(COLLAPSE_KEY, "1"); } catch {}
  }
  function expand() {
    if (compactRoute) { setExpandedHere(true); return; }
    setCollapsed(false);
    try { window.localStorage.removeItem(COLLAPSE_KEY); } catch {}
  }
  function go(href: string) { setPanelOpen(false); router.push(href); }

  const enableVoiceFromConversation = useCallback(() => {
    if (!voiceSupported) return;
    window.dispatchEvent(new CustomEvent("jobly:jia-preferences-changed", {
      detail: { mode: "voice", enabled: true, proactive: prefs.proactive },
    }));
  }, [prefs.proactive, voiceSupported]);

  if (!visible) return null;

  const statusLabel = prefs.mode === "voice"
    ? (voiceSupported ? (listening ? t("jia.state.listening") : t("jia.state.voice")) : t("jia.state.voiceUnavailable"))
    : t("jia.state.text");

  return (
    <>
      <div ref={constraintsRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[44]" />

      {targetRect && (
        <div aria-hidden="true" className="pointer-events-none fixed z-[44] rounded-xl border-[3px] border-canari-blue"
          style={{ left: targetRect.left - 4, top: targetRect.top - 4, width: targetRect.width + 8, height: targetRect.height + 8 }} />
      )}

      <motion.div
        drag dragControls={dragControls} dragListener={false} dragMomentum={false} dragElastic={0.05} dragConstraints={constraintsRef}
        onDragStart={() => { wasDragged.current = true; }}
        onDragEnd={() => { window.setTimeout(() => { wasDragged.current = false; }, 60); }}
        aria-label={t("jia.aria")}
        className={`fixed right-2 z-[45] flex flex-col items-end gap-2 sm:right-4 ${suspended ? "pointer-events-none invisible" : "pointer-events-auto"}`}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)", touchAction: "none" }}
        animate={{ opacity: suspended ? 0 : 1 }} transition={{ duration: 0.15 }}
      >
        {!panelOpen && (
          <>
        {/* Bulle de message + panneau d’actions — ancrés au personnage */}
        <AnimatePresence>
          {bubble && !panelOpen && (
            <motion.div key="stack" initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.2 }}
              className="absolute bottom-full right-0 mb-2 flex w-[min(280px,calc(100vw-24px))] flex-col items-end gap-2">
                  {bubble && (
                <div role="status" aria-live="polite" className="relative w-full rounded-[18px] border-2 border-canari-blue bg-canari py-2.5 pl-3.5 pr-9 text-[13px] font-extrabold leading-[1.4] text-canari-blue shadow-[0_12px_30px_rgba(0,87,184,.2)]">
                  {bubble.text}
                  {sourceLinks.length > 0 && (
                    <div className="mt-2 border-t border-canari-blue/20 pt-2 text-[10px] font-semibold">
                      <p className="mb-1 font-black uppercase tracking-[0.08em]">Sources consultées</p>
                      <div className="flex flex-col gap-1">
                        {sourceLinks.map((source) => (
                          <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="truncate underline underline-offset-2 hover:opacity-70">{source.title || source.url}</a>
                        ))}
                      </div>
                    </div>
                  )}
                  <button type="button" onClick={dismissBubble} aria-label={t("jia.dismiss")}
                    className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full text-canari-blue/70 hover:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canari-blue">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                  </button>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

        {showFigure ? (
          <div data-jia-presence-anchor="true" className="relative h-[96px] w-[96px] sm:h-[120px] sm:w-[120px]" onPointerDown={(e) => dragControls.start(e)}>
            <button type="button" onClick={() => { if (!wasDragged.current) setPanelOpen((v) => !v); }} aria-expanded={panelOpen} aria-label={t("jia.open")} title={t("jia.move")}
              className="absolute inset-0 grid cursor-grab place-items-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-canari-blue/30 active:cursor-grabbing">
              <JiaPresenceMark size="lg" listening={listening} speaking={speaking} />
            </button>
            <button type="button" onClick={minimize} aria-label={t("jia.minimize")} title={t("jia.minimize")}
              className="absolute -left-1 top-0 z-10 grid h-9 w-9 place-items-center rounded-full border border-line bg-white/95 text-muted shadow-md transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canari-blue">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 12h12" /></svg>
            </button>
            {prefs.mode === "voice" && (
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-canari-blue bg-canari px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-canari-blue">
                {statusLabel}
              </span>
            )}
          </div>
        ) : (
          <div onPointerDown={(e) => dragControls.start(e)}>
            <button type="button" onClick={() => { if (!wasDragged.current) expand(); }} aria-label={t("jia.open")} title={t("jia.open")}
              className="grid h-[52px] w-[52px] place-items-center rounded-full border border-[#FFD21A] bg-white shadow-[0_10px_26px_rgba(0,87,184,.22)] transition active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-canari-blue/30">
              <JiaPresenceMark size="md" listening={listening} speaking={speaking} />
            </button>
          </div>
        )}
          </>
        )}
      </motion.div>

      <JiaConversationSurface
        open={panelOpen}
        ecosystem={eco}
        messages={conversationMessages}
        inputValue={commandInput}
        busy={commandBusy}
        status={healthStatus}
        voiceMode={prefs.mode === "voice"}
        listening={listening}
        speaking={speaking}
        pendingAction={pendingAction}
        quickLinks={[...CHIPS[eco].map((item) => ({ label: t(item.key), href: item.href })), { label: "Extension J’IA pour ordinateur", href: "/jia/extension" }]}
        onClose={() => { setPanelOpen(false); dismissBubble(); }}
        onInputChange={setCommandInput}
        onSubmit={() => void sendTextCommand()}
        onConfirmAction={() => void confirmPendingAction()}
        onCancelAction={() => setPendingAction(null)}
        onNavigate={(href) => href === "/jia/extension" ? go("/jia/extension") : go(href)}
        onPrepareApplication={prepareJiaApplication}
        onSubmitAssessment={submitJiaAssessment}
        onSubmitApplication={submitJiaApplication}
        onSaveProfile={saveJiaProfile}
        onUploadCv={uploadJiaCv}
        onUpdateWorkspace={updateJiaWorkspace}
        hasMoreMessages={hasMoreConversationMessages}
        loadingOlderMessages={loadingOlderMessages}
        onLoadOlderMessages={() => void loadOlderConversationMessages()}
        onEnableVoice={voiceSupported ? enableVoiceFromConversation : undefined}
      />
    </>
  );
}

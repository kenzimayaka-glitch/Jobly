"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Compass,
  Grid2X2,
  LayoutDashboard,
  MessageCircle,
  Mic,
  Presentation,
  ShieldCheck,
  Shuffle,
  Sparkles,
  X,
} from "lucide-react";
import JIA3D from "@/components/JIA/JIA3D";
import {
  pickJiaPresentationLayout,
  resolveJiaExperience,
  type JiaExperienceDevice,
  type JiaExperienceIntent,
  type JiaExperienceRole,
  type JiaPresentationMode,
} from "@/lib/jia/experience-engine";
import JiaWorkspaceBlocks from "@/components/jia/JiaWorkspaceBlocks";
import type { JiaWorkspaceBlock, JiaWorkspaceOffer } from "@/lib/jia/workspace";

export type JiaConversationMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
  sources?: Array<{ title: string; url: string; snippet?: string }>;
  workspace?: JiaWorkspaceBlock;
};

type JiaEcosystem = "TALENT" | "RECRUITER" | "PARTNER";

type Props = {
  open: boolean;
  ecosystem: JiaEcosystem;
  messages: JiaConversationMessage[];
  inputValue: string;
  busy: boolean;
  status: "idle" | "checking" | "ready" | "error";
  voiceMode: boolean;
  listening: boolean;
  speaking: boolean;
  pendingAction?: { type: string; message: string; target?: string } | null;
  quickLinks: Array<{ label: string; href: string }>;
  onClose: () => void;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onConfirmAction: () => void;
  onCancelAction: () => void;
  onNavigate: (href: string) => void;
  onPrepareApplication: (offer: JiaWorkspaceOffer) => Promise<void>;
  onSubmitAssessment: (args: { messageId: string; assessmentId: string; answers: Record<string, unknown>; score: number; resultSummary: string }) => Promise<void>;
  onSubmitApplication: (args: { messageId: string; applicationId: string; letter: string }) => Promise<void>;
  onEnableVoice?: () => void;
};

const MODES: Array<{
  id: JiaPresentationMode;
  label: string;
  icon: typeof MessageCircle;
}> = [
  { id: "messenger", label: "Fil", icon: MessageCircle },
  { id: "gallery", label: "Galerie", icon: Grid2X2 },
  { id: "stage", label: "Scène", icon: Presentation },
  { id: "workspace", label: "Atelier", icon: LayoutDashboard },
  { id: "explorer", label: "Explorer", icon: Compass },
  { id: "interactive", label: "Interactif", icon: Sparkles },
];

function inferIntent(text: string, ecosystem: JiaEcosystem): JiaExperienceIntent {
  const value = text.toLocaleLowerCase();
  if (/offre|emploi|poste|job|vacanc/.test(value)) {
    return ecosystem === "RECRUITER" ? "candidate_search" : "opportunities";
  }
  if (/candidat|recrut|entretien|ats/.test(value)) return "recruitment";
  if (/cv|document|lettre|profil|expérience|compétence/.test(value)) return "document";
  if (/postul|candidature|application/.test(value)) return "application";
  if (/question|choix|préférence|questionnaire/.test(value)) return "questionnaire";
  if (/mobilité|départ|destination|pays|ville/.test(value)) return "mobility";
  if (/programme|bénéficiaire|partenaire/.test(value)) return "program";
  if (/statistique|rapport|indicateur|analyse/.test(value)) return "analytics";
  if (/présente|explique|montre-moi/.test(value)) return "presentation";
  return "conversation";
}

function roleFromEcosystem(ecosystem: JiaEcosystem): JiaExperienceRole {
  if (ecosystem === "RECRUITER") return "RECRUITER";
  if (ecosystem === "PARTNER") return "PARTNER";
  return "TALENT";
}

function timeLabel(timestamp: number) {
  try {
    return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(timestamp);
  } catch {
    return "";
  }
}

function layoutSurface(layout: JiaPresentationMode) {
  switch (layout) {
    case "stage":
      return "bg-[#0B2452] text-white";
    case "explorer":
      return "bg-[#F2F7FF] text-[#102B55]";
    case "workspace":
      return "bg-[#F7F9FC] text-[#10233F]";
    case "gallery":
      return "bg-[#FFFDF4] text-[#102B55]";
    case "interactive":
      return "bg-[#F4F8FF] text-[#102B55]";
    default:
      return "bg-white text-[#10233F]";
  }
}

function layoutGuide(layout: JiaPresentationMode) {
  switch (layout) {
    case "gallery":
      return {
        eyebrow: "GALERIE DE CONVERSATION",
        title: "Découvrir et comparer",
        description: "Les messages prennent la forme de cartes aérées, faciles à parcourir.",
      };
    case "workspace":
      return {
        eyebrow: "ESPACE DE TRAVAIL",
        title: "Construire ensemble",
        description: "Un cadre plus structuré pour avancer sur tes documents et tes décisions.",
      };
    case "explorer":
      return {
        eyebrow: "EXPLORATION",
        title: "Ouvrir le champ des possibles",
        description: "Une présentation plus ample pour parcourir les idées et les pistes évoquées.",
      };
    case "interactive":
      return {
        eyebrow: "MODE INTERACTIF",
        title: "Avancer étape par étape",
        description: "Une composition pensée pour mettre les questions et les choix en évidence.",
      };
    default:
      return null;
  }
}

function messageSurface(layout: JiaPresentationMode, role: "user" | "assistant") {
  if (role === "user") {
    return layout === "stage"
      ? "bg-[#FFD21A] text-[#10233F]"
      : "bg-[#1264EB] text-white";
  }
  switch (layout) {
    case "stage":
      return "border border-white/15 bg-white/10 text-white shadow-[0_12px_32px_rgba(0,0,0,.12)]";
    case "gallery":
      return "border border-[#F0E6B8] bg-white text-[#10233F] shadow-[0_12px_30px_rgba(16,43,85,.07)]";
    case "explorer":
      return "border border-[#DDE8F7] bg-white/90 text-[#10233F] shadow-[0_12px_30px_rgba(16,43,85,.06)]";
    default:
      return "border border-[#E6ECF4] bg-white text-[#10233F] shadow-[0_8px_24px_rgba(16,43,85,.055)]";
  }
}

export default function JiaConversationSurface(props: Props) {
  const {
    open, ecosystem, messages, inputValue, busy, status, voiceMode, listening,
    pendingAction, quickLinks, onClose, onInputChange, onSubmit, speaking,
    onConfirmAction, onCancelAction, onNavigate, onPrepareApplication, onSubmitAssessment, onSubmitApplication,
  } = props;
  const reducedMotion = useReducedMotion();
  const visualTransition = reducedMotion ? "transition-none" : "transition-all duration-500 ease-out";
  const [selectedLayout, setSelectedLayout] = useState<"auto" | JiaPresentationMode>("auto");
  const [autoLayout, setAutoLayout] = useState<JiaPresentationMode>("messenger");
  const [layoutRefresh, setLayoutRefresh] = useState(0);
  const layoutHistory = useRef<JiaPresentationMode[]>([]);
  const [device, setDevice] = useState<JiaExperienceDevice>("desktop");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const bottomAnchor = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateDevice = () => {
      const width = window.innerWidth;
      setDevice(width < 640 ? "mobile" : width < 1024 ? "tablet" : "desktop");
    };
    updateDevice();
    window.addEventListener("resize", updateDevice, { passive: true });
    return () => window.removeEventListener("resize", updateDevice);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const lastUserMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "user")?.text ?? "",
    [messages],
  );
  useEffect(() => {
    if (!open) return;
    bottomAnchor.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "end" });
  }, [busy, messages.length, open, reducedMotion]);

  const role = roleFromEcosystem(ecosystem);
  const intent = inferIntent(lastUserMessage, ecosystem);
  const experience = resolveJiaExperience({
    role,
    intent,
    device,
    lockedLayout: selectedLayout === "auto" ? null : selectedLayout,
    motionPreference: reducedMotion ? "reduced" : "immersive",
    systemReducedMotion: Boolean(reducedMotion),
  });
  const layout = selectedLayout === "auto" ? autoLayout : experience.layout;

  useEffect(() => {
    if (selectedLayout !== "auto") return;
    const next = pickJiaPresentationLayout(role, intent, layoutHistory.current);
    layoutHistory.current = [...layoutHistory.current, next].slice(-12);
    setAutoLayout(next);
  }, [intent, lastUserMessage, layoutRefresh, role, selectedLayout]);
  const suggestions = ecosystem === "RECRUITER"
    ? ["Trouve des candidats pertinents", "Aide-moi à rédiger une offre", "Résume mes candidatures"]
    : ecosystem === "PARTNER"
      ? ["Présente mes programmes", "Aide-moi à suivre mes bénéficiaires", "Prépare un rapport"]
      : ["Trouve des offres adaptées à mon profil", "Aide-moi à améliorer mon CV", "Prépare ma candidature"];
  const statusText = status === "checking"
    ? "Connexion en cours"
    : status === "error"
      ? "Connexion à vérifier"
      : status === "ready"
        ? "Connectée à Jobly"
        : voiceMode
          ? listening ? "Écoute active" : "Mode vocal"
          : "À ton écoute";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onSubmit();
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="jia-360-surface"
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.22 }}
        className="fixed inset-0 z-[80] flex items-stretch justify-center bg-[#07172F]/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-3 lg:justify-end lg:p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.section
          role="dialog"
          aria-modal="true"
          aria-label="Conversation J’IA 360"
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 18, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12, scale: 0.99 }}
          transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex h-[100dvh] w-full max-w-[780px] min-h-0 flex-col overflow-hidden border border-white/70 bg-white shadow-[0_30px_100px_rgba(7,23,47,.28)] sm:h-[min(900px,calc(100dvh-24px))] sm:rounded-[28px] lg:max-w-[min(860px,calc(100vw-32px))]"
          style={{
            paddingTop: "env(safe-area-inset-top, 0px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          <header className={`relative shrink-0 overflow-hidden ${layout === "stage" ? "bg-[#0B2452]" : "bg-white"}`}>
            <div className="pointer-events-none absolute -right-14 -top-20 h-48 w-48 rounded-full bg-[#FFD21A]/25 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 -top-20 h-44 w-44 rounded-full bg-[#1264EB]/15 blur-3xl" />
            <div className="relative flex items-center gap-3 px-4 pb-3 pt-3 sm:px-6 sm:pt-4">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-[#D7E4F7] bg-[#FFF7D3] shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/jia/outfits/blue/head.webp" alt="Portrait de J’IA" className="h-full w-full scale-[1.35] object-contain object-center" />
                <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#18A558]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`flex items-center gap-2 text-[15px] font-extrabold tracking-tight ${layout === "stage" ? "text-white" : "text-[#10233F]"}`}>
                  J’IA <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[.12em] ${layout === "stage" ? "bg-white/10 text-[#FFD21A]" : "bg-[#FFF4BE] text-[#775900]"}`}>360</span>
                </div>
                <div className={`mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold ${layout === "stage" ? "text-white/70" : "text-[#65758B]"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status === "error" ? "bg-[#F28C28]" : "bg-[#18A558]"}`} />
                  {statusText}
                </div>
              </div>
              {voiceMode && (
                <div className={`hidden rounded-full px-2.5 py-1 text-[10px] font-bold sm:block ${layout === "stage" ? "bg-white/10 text-white" : "bg-[#EDF5FF] text-[#1264EB]"}`}>
                  <Mic size={12} className="mr-1 inline" /> {listening ? "Micro actif" : "Voix"}
                </div>
              )}
              <button type="button" onClick={onClose} aria-label="Fermer la conversation" className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1264EB] ${layout === "stage" ? "text-white hover:bg-white/10" : "text-[#5E6E82] hover:bg-[#F0F4F9]"}`}>
                <X size={19} />
              </button>
            </div>

            {layout === "stage" && (
              <div className="relative mx-4 mb-3 flex items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[.07] px-3 py-2.5 sm:mx-6">
                <div className="pointer-events-none absolute -right-3 -top-8 h-24 w-24 rounded-full bg-[#FFD21A]/20 blur-2xl" />
                <div className="relative h-28 w-20 shrink-0 sm:h-36 sm:w-24">
                  <JIA3D speaking={speaking} />
                </div>
                <div className="relative min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#FFD21A]">J’IA prend la parole</p>
                  <p className="mt-0.5 text-[12px] leading-5 text-white/85">Je présente les informations sans interrompre le fil de notre échange.</p>
                </div>
                <Sparkles className="ml-auto shrink-0 text-[#FFD21A]" size={18} />
              </div>
            )}
          </header>

          <nav aria-label="Présentation de la conversation" className={`shrink-0 border-y px-3 py-2 ${layout === "stage" ? "border-white/10 bg-[#0B2452]" : "border-[#E9EEF5] bg-white"}`}>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button type="button" aria-pressed={selectedLayout === "auto"} onClick={() => { setSelectedLayout("auto"); setLayoutRefresh((value) => value + 1); }}
                className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-extrabold transition ${selectedLayout === "auto" ? "bg-[#FFD21A] text-[#10233F]" : layout === "stage" ? "bg-white/10 text-white/80" : "bg-[#F1F5FA] text-[#66768B]"}`}>
                <Sparkles size={13} /> Auto
              </button>
              <button
                type="button"
                onClick={() => { setSelectedLayout("auto"); setLayoutRefresh((value) => value + 1); }}
                title="Nouvelle composition"
                aria-label="Nouvelle composition"
                className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1264EB] ${layout === "stage" ? "border-white/15 bg-white/10 text-white/80 hover:bg-white/15" : "border-[#DCE6F2] bg-white text-[#52637A] hover:border-[#1264EB]/40 hover:text-[#1264EB]"}`}
              >
                <Shuffle size={13} /> Nouvelle composition
              </button>
              {MODES.map((mode) => {
                const Icon = mode.icon;
                const active = selectedLayout === mode.id;
                return (
                  <button key={mode.id} type="button" aria-pressed={active} onClick={() => setSelectedLayout(mode.id)}
                    className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-extrabold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1264EB] ${active ? "bg-[#1264EB] text-white shadow-sm" : layout === "stage" ? "bg-white/10 text-white/80 hover:bg-white/15" : "bg-[#F1F5FA] text-[#52637A] hover:bg-[#E8EEF7]"}`}>
                    <Icon size={13} /> {mode.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${visualTransition} ${layoutSurface(layout)}`}>
            {layout === "explorer" && (
              <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-8 h-56 w-56 rounded-full bg-[#FFD21A]/20 blur-3xl" />
            )}
            {layout === "gallery" && (
              <div aria-hidden="true" className="pointer-events-none absolute -left-24 bottom-12 h-56 w-56 rounded-full bg-[#1264EB]/10 blur-3xl" />
            )}

            <div className={`relative flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6 ${layout === "stage" ? "scrollbar-thin" : ""}`} role="log" aria-live="polite" aria-relevant="additions text">
              {layoutGuide(layout) && (
                <div className={`mx-auto w-full max-w-2xl overflow-hidden rounded-[22px] border px-4 py-3.5 sm:px-5 ${layout === "gallery" ? "border-[#E9DFB3] bg-white shadow-[0_14px_32px_rgba(16,43,85,.06)]" : layout === "workspace" ? "border-[#DDE7F4] bg-white shadow-[0_12px_28px_rgba(16,43,85,.05)]" : layout === "explorer" ? "border-[#CFE0F7] bg-gradient-to-br from-white to-[#EAF3FF]" : "border-[#F0DFA0] bg-gradient-to-br from-white to-[#FFF8D8]"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${layout === "interactive" ? "bg-[#F28C28]" : "bg-[#1264EB]"}`} />
                    <p className={`text-[9px] font-extrabold uppercase tracking-[.16em] ${layout === "interactive" ? "text-[#9B6500]" : "text-[#52709A]"}`}>
                      {layoutGuide(layout)?.eyebrow}
                    </p>
                  </div>
                  <p className="mt-1.5 text-[16px] font-extrabold tracking-[-.025em] text-[#10233F] sm:text-[18px]">{layoutGuide(layout)?.title}</p>
                  <p className="mt-1 text-[11px] leading-5 text-[#6B7C92]">{layoutGuide(layout)?.description}</p>
                </div>
              )}
              {messages.length === 0 ? (
                <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-6">
                  <div className={`mb-5 flex items-center gap-3 ${layout === "stage" ? "text-white" : "text-[#10233F]"}`}>
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#FFD21A] text-[#10233F]">
                      <Sparkles size={21} />
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-[#D29C00]">Ton espace J’IA</p>
                      <h2 className="text-[23px] font-extrabold leading-tight tracking-[-.04em] sm:text-[28px]">On avance ensemble.</h2>
                    </div>
                  </div>
                  <p className={`max-w-lg text-[13px] leading-6 ${layout === "stage" ? "text-white/75" : "text-[#65758B]"}`}>
                    Décris ce que tu veux accomplir. Je peux t’aider à explorer les possibilités Jobly et préparer la prochaine étape avec toi.
                  </p>
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    {suggestions.map((suggestion, index) => (
                      <button key={suggestion} type="button" onClick={() => onInputChange(suggestion)}
                        className={`group flex min-h-[58px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-[12px] font-bold transition active:scale-[.99] ${layout === "stage" ? "border-white/15 bg-white/[.07] text-white hover:bg-white/10" : "border-[#DFE8F3] bg-white text-[#173A6B] hover:border-[#1264EB]/40 hover:shadow-[0_8px_22px_rgba(18,100,235,.08)]"}`}>
                        <span>{suggestion}</span>
                        <ArrowUp size={15} className="rotate-45 text-[#D39C00] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={`mx-auto flex w-full flex-col gap-4 ${layout === "gallery" ? "max-w-3xl" : "max-w-2xl"}`}>
                  {messages.map((message, index) => {
                    const mine = message.role === "user";
                    return (
                      <motion.article
                        key={message.id}
                        initial={reducedMotion ? false : { opacity: 0, y: 9 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: reducedMotion ? 0 : 0.22, delay: reducedMotion ? 0 : Math.min(index * 0.018, 0.12) }}
                        className={`flex w-full items-end gap-2.5 ${visualTransition} ${mine ? "justify-end" : "justify-start"}`}
                      >
                        {!mine && (
                          <div className={`mb-1 grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-xl border ${layout === "stage" ? "border-white/15 bg-white/10" : "border-[#E2EAF4] bg-[#FFF7D7]"}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/jia/outfits/blue/head.webp" alt="" aria-hidden="true" className="h-full w-full scale-[1.4] object-contain" />
                          </div>
                        )}
                        <div className={`min-w-0 ${layout === "gallery" && !mine ? "max-w-[94%] sm:max-w-[96%]" : "max-w-[88%] sm:max-w-[82%]"} ${mine ? "items-end" : "items-start"} flex flex-col`}>
                          <div className={`rounded-[21px] px-4 py-3 text-[13px] leading-[1.65] ${visualTransition} sm:px-5 sm:py-3.5 ${mine ? "rounded-br-[7px]" : "rounded-bl-[7px]"} ${messageSurface(layout, message.role)} ${layout === "workspace" && !mine ? "rounded-xl border-l-[3px] border-l-[#1264EB]" : ""} ${layout === "gallery" && !mine ? "w-full min-w-[min(250px,70vw)] rounded-[24px] border-t-[3px] border-t-[#FFD21A]" : ""} ${layout === "interactive" && !mine ? "rounded-[24px] border-l-[4px] border-l-[#F28C28]" : ""} ${layout === "explorer" && !mine ? "rounded-[24px] bg-white/95" : ""}`}>
                            <p className="whitespace-pre-wrap break-words">{message.text}</p>
                            {message.sources && message.sources.length > 0 && (
                              <div className={`mt-3 border-t pt-2.5 ${layout === "stage" && !mine ? "border-white/15" : "border-[#DCE5F0]"}`}>
                                <p className={`mb-1.5 text-[9px] font-extrabold uppercase tracking-[.14em] ${layout === "stage" && !mine ? "text-[#FFD21A]" : "text-[#6B7C92]"}`}>Sources consultées</p>
                                {message.sources.map((source) => (
                                  <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"
                                    className={`block truncate py-1 text-[11px] font-bold underline underline-offset-2 ${layout === "stage" && !mine ? "text-white" : mine ? "text-white" : "text-[#1264EB]"}`}>
                                    {source.title || source.url}
                                  </a>
                                ))}
                              </div>
                            )}
                            {message.workspace && !mine && (
                              <JiaWorkspaceBlocks
                                block={message.workspace}
                                messageId={message.id}
                                onNavigate={onNavigate}
                                onPrepareApplication={onPrepareApplication}
                                onSubmitAssessment={onSubmitAssessment}
                                onSubmitApplication={onSubmitApplication}
                              />
                            )}
                          </div>
                          <span className={`mt-1 px-1 text-[9px] font-semibold ${layout === "stage" ? "text-white/45" : "text-[#98A5B6]"}`}>
                            {timeLabel(message.createdAt)}
                          </span>
                        </div>
                      </motion.article>
                    );
                  })}
                  {busy && (
                    <div className="flex items-end gap-2.5" role="status" aria-label="J’IA prépare une réponse">
                      <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#E2EAF4] bg-[#FFF7D7]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/jia/outfits/blue/head.webp" alt="" aria-hidden="true" className="h-full w-full scale-[1.4] object-contain" />
                      </div>
                      <div className={`flex items-center gap-1.5 rounded-2xl rounded-bl-md px-4 py-3 ${layout === "stage" ? "bg-white/10" : "bg-white shadow-sm"}`}>
                        {[0, 1, 2].map((dot) => <span key={dot} className={`h-1.5 w-1.5 rounded-full ${layout === "stage" ? "bg-[#FFD21A]" : "bg-[#1264EB]"} ${reducedMotion ? "" : "animate-pulse"}`} style={{ animationDelay: `${dot * 180}ms` }} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={bottomAnchor} aria-hidden="true" />
            </div>

            {pendingAction && (
              <div className="relative mx-3 mb-2 shrink-0 rounded-2xl border border-[#1264EB]/20 bg-white p-3 shadow-[0_10px_28px_rgba(18,100,235,.08)] sm:mx-6 sm:p-4">
                <div className="flex items-start gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FFF3B5] text-[#7A5C00]"><ShieldCheck size={17}/></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-extrabold text-[#10233F]">J’IA attend ton autorisation</p>
                    <p className="mt-1 break-words text-[11px] leading-5 text-[#64748B]">{pendingAction.message}</p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={onConfirmAction} disabled={busy} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#1264EB] px-4 text-[11px] font-extrabold text-white hover:bg-[#0C53C7] disabled:opacity-50">
                        <Check size={14}/> Autoriser
                      </button>
                      <button type="button" onClick={onCancelAction} disabled={busy} className="min-h-10 rounded-xl border border-[#DCE5F0] px-4 text-[11px] font-extrabold text-[#52637A] hover:bg-[#F6F8FB]">Annuler</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <footer className={`relative shrink-0 border-t px-3 pb-3 pt-2.5 sm:px-6 sm:pb-4 ${layout === "stage" ? "border-white/10 bg-[#0B2452]" : "border-[#E8EDF4] bg-white"}`}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className={`text-[9px] font-bold ${layout === "stage" ? "text-white/55" : "text-[#8290A2]"}`}>Entrée pour envoyer · Maj + Entrée pour une ligne</div>
                <button type="button" onClick={() => setShowShortcuts((value) => !value)} aria-expanded={showShortcuts}
                  className={`inline-flex items-center gap-1 text-[10px] font-extrabold ${layout === "stage" ? "text-[#FFD21A]" : "text-[#1264EB]"}`}>
                  Raccourcis Jobly <ChevronDown size={12} className={showShortcuts ? "rotate-180" : ""}/>
                </button>
              </div>
              {showShortcuts && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {quickLinks.map((link) => (
                    <button key={link.href} type="button" onClick={() => onNavigate(link.href)}
                      className="min-h-8 rounded-full border border-[#DCE7F6] bg-[#F5F8FD] px-3 text-[10px] font-bold text-[#315B92] hover:border-[#1264EB]/40">
                      {link.label}
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={submit} className={`flex items-end gap-2 rounded-[22px] border p-2 shadow-[0_8px_28px_rgba(10,25,49,.07)] transition focus-within:border-[#1264EB] focus-within:ring-4 focus-within:ring-[#1264EB]/10 ${layout === "stage" ? "border-white/15 bg-white/10" : "border-[#DCE5F0] bg-[#F9FBFE]"}`}>
                <textarea
                  value={inputValue}
                  onChange={(event) => onInputChange(event.target.value)}
                  onKeyDown={onComposerKeyDown}
                  rows={1}
                  maxLength={9000}
                  placeholder={ecosystem === "RECRUITER" ? "Que souhaites-tu faire pour ton recrutement ?" : ecosystem === "PARTNER" ? "Comment puis-je t’accompagner ?" : "Écris à J’IA…"}
                  aria-label="Message à J’IA"
                  disabled={busy}
                  className={`max-h-32 min-h-11 min-w-0 flex-1 resize-y bg-transparent px-3 py-3 text-[13px] leading-5 outline-none placeholder:text-[#9AA7B6] disabled:opacity-60 ${layout === "stage" ? "text-white" : "text-[#10233F]"}`}
                />
                {props.onEnableVoice && !voiceMode && (
                  <button type="button" onClick={props.onEnableVoice} aria-label="Activer le mode vocal" title="Mode vocal"
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${layout === "stage" ? "text-white/75 hover:bg-white/10" : "text-[#687A91] hover:bg-[#EAF0F8]"}`}>
                    <Mic size={18}/>
                  </button>
                )}
                <button type="submit" disabled={busy || !inputValue.trim()} aria-label="Envoyer le message"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#FFD21A] text-[#10233F] shadow-sm transition hover:brightness-95 active:scale-95 disabled:opacity-40">
                  {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#10233F]/25 border-t-[#10233F]"/> : <ArrowUp size={19} strokeWidth={2.8}/>}
                </button>
              </form>
              <div className={`mt-2 flex items-center justify-center gap-1 text-[9px] font-medium ${layout === "stage" ? "text-white/40" : "text-[#A0ACBA]"}`}>
                <ShieldCheck size={10}/> Tes actions restent soumises à tes droits et confirmations.
              </div>
            </footer>
          </div>
        </motion.section>
      </motion.div>
    </AnimatePresence>
  );
}

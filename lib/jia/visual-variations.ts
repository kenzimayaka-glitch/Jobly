/**
 * J’IA 360 — rendered visual variation catalog.
 *
 * Every record carries concrete renderer parameters. The catalog is deliberately
 * finite and testable; no variation is inferred from a theoretical product set.
 */

export type JiaConversationLayoutVariation = {
  id: string;
  structure: "stack" | "split" | "magazine" | "timeline" | "focus" | "rail" | "dossier" | "cards" | "stage" | "compact";
  columns: 1 | 2;
  density: "airy" | "balanced" | "compact";
  maxWidth: number;
  messageGap: number;
  assistantOffset: number;
  cardRadius: number;
  avatarSide: "left" | "top" | "hidden";
};

const STRUCTURES: JiaConversationLayoutVariation["structure"][] = [
  "stack","split","magazine","timeline","focus","rail","dossier","cards","stage","compact",
];

export const JIA_CONVERSATION_LAYOUT_VARIATIONS: JiaConversationLayoutVariation[] = Array.from({ length: 50 }, (_, index) => {
  const structureIndex = index % STRUCTURES.length;
  const densityIndex = Math.floor(index / STRUCTURES.length);
  const structure = STRUCTURES[structureIndex];
  return {
    id: "conversation-layout-" + String(index + 1).padStart(2, "0"),
    structure,
    columns: structure === "split" || structure === "cards" || structure === "magazine" ? (densityIndex % 2 ? 2 : 1) : 1,
    density: densityIndex % 3 === 0 ? "airy" : densityIndex % 3 === 1 ? "balanced" : "compact",
    maxWidth: 560 + structureIndex * 22 + densityIndex * 7,
    messageGap: 10 + (densityIndex % 5) * 3 + (structureIndex % 3),
    assistantOffset: 0.04 + structureIndex * 0.012 + densityIndex * 0.006,
    cardRadius: 14 + ((structureIndex * 3 + densityIndex) % 7) * 2,
    avatarSide: structureIndex % 3 === 0 ? "left" : structureIndex % 3 === 1 ? "top" : "hidden",
  };
});

export type JiaSceneVariation = {
  id: string;
  motif: "orbit" | "ripple" | "constellation" | "topography" | "ribbon" | "halo" | "grid" | "petals" | "arc" | "spark";
  composition: number;
  scale: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
  layers: number;
  blur: number;
};

const SCENE_MOTIFS: JiaSceneVariation["motif"][] = [
  "orbit","ripple","constellation","topography","ribbon","halo","grid","petals","arc","spark",
];

export const JIA_SCENE_VARIATIONS: JiaSceneVariation[] = Array.from({ length: 50 }, (_, index) => {
  const motifIndex = index % SCENE_MOTIFS.length;
  const composition = Math.floor(index / SCENE_MOTIFS.length);
  return {
    id: "scene-" + String(index + 1).padStart(2, "0"),
    motif: SCENE_MOTIFS[motifIndex],
    composition,
    scale: 0.72 + motifIndex * 0.035 + composition * 0.018,
    rotation: ((motifIndex * 19 + composition * 11) % 90) - 45,
    offsetX: ((motifIndex * 17 + composition * 13) % 61) - 30,
    offsetY: ((motifIndex * 11 + composition * 17) % 49) - 24,
    layers: 2 + ((motifIndex + composition) % 4),
    blur: 8 + ((motifIndex * 2 + composition) % 6) * 4,
  };
});

export type JiaAvatarFramingVariation = {
  id: string;
  anchor: "start" | "center" | "end" | "upper" | "lower";
  scale: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  crop: "full" | "three-quarter" | "portrait" | "close-up" | "context";
};

const AVATAR_ANCHORS: JiaAvatarFramingVariation["anchor"][] = ["start","center","end","upper","lower"];
const AVATAR_CROPS: JiaAvatarFramingVariation["crop"][] = ["full","three-quarter","portrait","close-up","context"];

export const JIA_AVATAR_FRAMING_VARIATIONS: JiaAvatarFramingVariation[] = Array.from({ length: 50 }, (_, index) => {
  const anchorIndex = index % AVATAR_ANCHORS.length;
  const cropIndex = Math.floor(index / AVATAR_ANCHORS.length) % AVATAR_CROPS.length;
  const scaleBand = Math.floor(index / 25);
  return {
    id: "avatar-frame-" + String(index + 1).padStart(2, "0"),
    anchor: AVATAR_ANCHORS[anchorIndex],
    crop: AVATAR_CROPS[cropIndex],
    scale: 0.84 + anchorIndex * 0.035 + cropIndex * 0.018 + scaleBand * 0.025,
    width: 64 + cropIndex * 9 + anchorIndex * 3,
    height: 94 + cropIndex * 10 + anchorIndex * 4,
    offsetX: (anchorIndex - 2) * (8 + cropIndex),
    offsetY: (cropIndex - 2) * (4 + anchorIndex),
  };
});

export type JiaMotionVariation = {
  id: string;
  axis: "x" | "y" | "scale" | "rotate" | "blur" | "clip";
  distance: number;
  duration: number;
  delay: number;
  spring: number;
  curve: "easeOut" | "easeInOut" | "backOut" | "circOut" | "anticipate";
};

const MOTION_AXES: JiaMotionVariation["axis"][] = ["x","y","scale","rotate","blur","clip"];
const MOTION_CURVES: JiaMotionVariation["curve"][] = ["easeOut","easeInOut","backOut","circOut","anticipate"];

export const JIA_SCENE_TRANSITIONS: JiaMotionVariation[] = Array.from({ length: 50 }, (_, index) => ({
  id: "scene-transition-" + String(index + 1).padStart(2, "0"),
  axis: MOTION_AXES[index % MOTION_AXES.length],
  distance: 4 + ((index * 7) % 31),
  duration: 0.16 + (index % 10) * 0.035,
  delay: (Math.floor(index / 10) % 3) * 0.025,
  spring: 12 + ((index * 5) % 24),
  curve: MOTION_CURVES[Math.floor(index / 6) % MOTION_CURVES.length],
}));

export type JiaMessageEntranceVariation = {
  id: string;
  axis: "x" | "y" | "scale" | "rotate";
  distance: number;
  duration: number;
  stagger: number;
  direction: "forward" | "reverse" | "center";
};

const ENTRANCE_AXES: JiaMessageEntranceVariation["axis"][] = ["x","y","scale","rotate"];

export const JIA_MESSAGE_ENTRANCES: JiaMessageEntranceVariation[] = Array.from({ length: 50 }, (_, index) => ({
  id: "message-entrance-" + String(index + 1).padStart(2, "0"),
  axis: ENTRANCE_AXES[index % ENTRANCE_AXES.length],
  distance: 3 + ((index * 9) % 36),
  duration: 0.12 + (index % 10) * 0.04,
  stagger: (Math.floor(index / 5) % 5) * 0.012,
  direction: index % 3 === 0 ? "forward" : index % 3 === 1 ? "reverse" : "center",
}));

export type JiaStickerReaction = { id: string; emoji: string; label: string };

const STICKER_REACTIONS: Array<[string, string, string]> = [
  ["sparkles","✨","Éclat"],["heart","❤️","Cœur"],["fire","🔥","Bravo"],["clap","👏","Applaudissements"],["thumbs-up","👍","J'aime"],
  ["thumbs-down","👎","Pas convaincu"],["star","⭐","Étoile"],["party","🎉","Fête"],["rocket","🚀","On y va"],["target","🎯","Objectif"],
  ["lightbulb","💡","Idée"],["brain","🧠","Réflexion"],["eyes","👀","Je regarde"],["thinking","🤔","Je réfléchis"],["hug","🤗","Soutien"],
  ["muscle","💪","Force"],["handshake","🤝","Accord"],["check","✅","Validé"],["warning","⚠️","Attention"],["bell","🔔","À suivre"],
  ["sun","☀️","Lumière"],["rainbow","🌈","Optimisme"],["flower","🌸","Fleur"],["leaf","🍃","Nature"],["crown","👑","Prestige"],
  ["medal","🏅","Réussite"],["trophy","🏆","Victoire"],["book","📚","Apprendre"],["pencil","✍️","Écrire"],["briefcase","💼","Travail"],
  ["chart","📈","Progression"],["money","💰","Valeur"],["globe","🌍","Afrique"],["pin","📍","Localisation"],["clock","⏰","Temps"],
  ["calendar","🗓️","Date"],["mail","✉️","Message"],["phone","📱","Mobile"],["computer","💻","Numérique"],["camera","📸","Souvenir"],
  ["gift","🎁","Cadeau"],["confetti","🎊","Confettis"],["smile","😊","Sourire"],["laugh","😂","Rire"],["cool","😎","Cool"],
  ["wow","🤩","Impressionnant"],["sad","😢","Tristesse"],["care","🥹","Touché"],["peace","✌️","Paix"],["wave","👋","Salut"],
];

export const JIA_STICKER_REACTIONS: JiaStickerReaction[] = STICKER_REACTIONS.map(([id, emoji, label]) => ({ id, emoji, label }));

export type JiaOfferPresentationVariation = {
  id: string;
  structure: "headline" | "split" | "compact" | "editorial" | "timeline" | "comparison" | "spotlight" | "list" | "mosaic" | "dossier";
  metadataOrder: readonly ["location" | "contract" | "deadline" | "remote", "location" | "contract" | "deadline" | "remote", "location" | "contract" | "deadline" | "remote"];
  matchPlacement: "top" | "aside" | "footer" | "inline" | "ribbon";
  actionPlacement: "footer" | "inline" | "rail" | "stacked" | "split";
  columns: 1 | 2;
  density: "airy" | "balanced" | "compact";
};

const OFFER_STRUCTURES: JiaOfferPresentationVariation["structure"][] = [
  "headline","split","compact","editorial","timeline","comparison","spotlight","list","mosaic","dossier",
];
const OFFER_META: JiaOfferPresentationVariation["metadataOrder"][] = [
  ["location","contract","deadline"],["contract","location","deadline"],["deadline","location","contract"],
  ["location","deadline","contract"],["contract","deadline","location"],
];

export const JIA_OFFER_PRESENTATIONS: JiaOfferPresentationVariation[] = Array.from({ length: 50 }, (_, index) => ({
  id: "offer-presentation-" + String(index + 1).padStart(2, "0"),
  structure: OFFER_STRUCTURES[index % 10],
  metadataOrder: OFFER_META[Math.floor(index / 10)],
  matchPlacement: (["top","aside","footer","inline","ribbon"] as const)[Math.floor(index / 2) % 5],
  actionPlacement: (["footer","inline","rail","stacked","split"] as const)[index % 5],
  columns: index % 2 === 0 ? 1 : 2,
  density: index % 3 === 0 ? "airy" : index % 3 === 1 ? "balanced" : "compact",
}));

export type JiaQuestionPresentationVariation = {
  id: string;
  arrangement: "stack" | "tiles" | "columns" | "focus" | "stepper" | "cards" | "matrix" | "rail" | "scenario" | "compact";
  optionShape: "pill" | "card" | "row" | "tile" | "numbered";
  columns: 1 | 2 | 3 | 4;
  showProgress: boolean;
  showQuestionNumber: boolean;
  density: "airy" | "balanced" | "compact";
};

export const JIA_QUESTION_PRESENTATIONS: JiaQuestionPresentationVariation[] = Array.from({ length: 50 }, (_, index) => ({
  id: "question-presentation-" + String(index + 1).padStart(2, "0"),
  arrangement: (["stack","tiles","columns","focus","stepper","cards","matrix","rail","scenario","compact"] as const)[index % 10],
  optionShape: (["pill","card","row","tile","numbered"] as const)[Math.floor(index / 10)],
  columns: ([1,2,3,4,2] as const)[Math.floor(index / 10)],
  showProgress: index % 2 === 0,
  showQuestionNumber: index % 3 !== 0,
  density: index % 3 === 0 ? "airy" : index % 3 === 1 ? "balanced" : "compact",
}));

export type JiaDocumentPresentationVariation = {
  id: string;
  structure: "sidebar" | "stack" | "timeline" | "editorial" | "profile" | "resume" | "portfolio" | "dossier" | "minimal" | "showcase";
  sectionOrder: readonly ["summary" | "skills" | "experience" | "education", "summary" | "skills" | "experience" | "education", "summary" | "skills" | "experience" | "education", "summary" | "skills" | "experience" | "education"];
  columns: 1 | 2;
  density: "airy" | "balanced" | "compact";
  headingScale: number;
};

const DOCUMENT_STRUCTURES: JiaDocumentPresentationVariation["structure"][] = [
  "sidebar","stack","timeline","editorial","profile","resume","portfolio","dossier","minimal","showcase",
];
const DOCUMENT_ORDERS: JiaDocumentPresentationVariation["sectionOrder"][] = [
  ["summary","skills","experience","education"],
  ["summary","experience","skills","education"],
  ["skills","summary","education","experience"],
  ["experience","skills","summary","education"],
  ["education","summary","skills","experience"],
];

export const JIA_DOCUMENT_PRESENTATIONS: JiaDocumentPresentationVariation[] = Array.from({ length: 50 }, (_, index) => ({
  id: "document-presentation-" + String(index + 1).padStart(2, "0"),
  structure: DOCUMENT_STRUCTURES[index % 10],
  sectionOrder: DOCUMENT_ORDERS[Math.floor(index / 10)],
  columns: index % 2 === 0 ? 1 : 2,
  density: index % 3 === 0 ? "airy" : index % 3 === 1 ? "balanced" : "compact",
  headingScale: 0.94 + (index % 10) * 0.025,
}));

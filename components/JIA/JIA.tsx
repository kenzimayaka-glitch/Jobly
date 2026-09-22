"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { JIA_100_MOVES, type JIA100Move } from "./movements";
import rig from "./JIA_Rig.json";
import { CANVAS, LAYOUT, PIVOT, RIG_SRC, type LayerName } from "./rigLayout";
import { CLIP_COOLDOWN_MS, JIA_CLIPS, pickClipSources, preloadClips } from "./clips";
import { getJIAOutfit, JIA_OUTFITS, type JIAOutfit } from "./outfits";

export type JIAMove = JIA100Move;
type Props = { speaking: boolean; gesture?: string; auto?: boolean; move?: JIA100Move };
type Bone = Record<string, any>;
type RigMove = { duration?: number; [bone: string]: any };

const RIG_MOVES = rig.moves as Record<string, RigMove>;
const RIG_PREFIX = new Map(Object.keys(RIG_MOVES).map((key) => [key.replace(/^\d+_/, ""), key]));

const GESTURE_MOVE: Record<string, JIA100Move> = {
  welcome: "wave_hi", validate: "stamping", reassure: "scarf_touch", encourage: "nod_slow", analyze: "scanning",
  curious: "look_around", "present-chart": "chart_up", filter: "point_button", point: "point_button", apply: "point_cv",
  "call-hr": "point_you", handshake: "hand_shake", "present-team": "explain_wide", "pay-os": "money", alert: "stop",
  secure: "hand_chest", disappointed: "think_doubt", tired: "breathe_deep", surprised: "eyebrow_raise", celebrate: "celebrate_jump",
  proud: "proud", wink: "wink_left", write: "writing",
};

const AUTO: JIA100Move[] = [
  "idle", "blink_slow", "smile_soft", "look_around", "nod_slow", "think_chin", "point_button",
  "scarf_adjust", "explain_open", "celebrate_fist", "listen_tilt", "reading", "matching", "proud",
];

const SPRING = { type: "spring", stiffness: 150, damping: 18, mass: 0.55 } as const;
const BREATH = 0.012;

function moveKey(move: JIA100Move) {
  return RIG_PREFIX.get(move) ?? RIG_PREFIX.get("idle")!;
}

function transformOf(bone: Bone = {}) {
  return { x: bone.x ?? 0, y: bone.y ?? 0, z: bone.z ?? 0, rotate: bone.rz ?? bone.rotate ?? 0, rotateX: bone.rx ?? bone.rotateX ?? 0, rotateY: bone.ry ?? bone.rotateY ?? 0, scale: bone.scale ?? 1 };
}

function transitionOf(values: Record<string, any>, bone: Bone = {}, duration = 0.7) {
  const keyframes = Object.values(values).some(Array.isArray);
  if (!keyframes) return SPRING;
  const repeat = typeof bone.repeat === "number" ? Math.max(0, bone.repeat - 1) : 0;
  return { duration, ease: "easeInOut", repeat } as const;
}

function useBlink(enabled: boolean) {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let dead = false;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        if (dead) return;
        setBlink(true);
        setTimeout(() => !dead && setBlink(false), 105);
        next();
      }, 2300 + Math.random() * 3200);
    };
    next();
    return () => { dead = true; clearTimeout(timer); };
  }, [enabled]);
  return blink;
}

function BoneGroup({ pivot, bone, duration, opacity = 1, children }: { pivot: { x: number; y: number }; bone?: Bone; duration: number; opacity?: number; children: ReactNode }) {
  const values = transformOf(bone);
  return <motion.div className="absolute inset-0 pointer-events-none" style={{ transformOrigin: `${pivot.x}% ${pivot.y}%`, transformStyle: "preserve-3d", backfaceVisibility: "hidden", transformPerspective: 1100 }} animate={{ ...values, opacity }} transition={transitionOf(values, bone, duration)}>{children}</motion.div>;
}

function Sprite({ name, animate, transition, srcOverride }: { name: LayerName; animate?: Record<string, any>; transition?: Record<string, any>; srcOverride?: string }) {
  const l = LAYOUT[name];
  const style: CSSProperties = { position: "absolute", left: `${l.left}%`, top: `${l.top}%`, width: `${l.width}%`, height: `${l.height}%`, maxWidth: "none", transformOrigin: "50% 50%", display: "none" };
  return <motion.img src={srcOverride ?? `${RIG_SRC}/${l.file}`} alt="" draggable={false} onError={(event) => { event.currentTarget.style.display = "none"; }} className="select-none pointer-events-none" style={style} animate={animate} transition={transition} />;
}

function eyeAnimation(side: "left" | "right", bone: Bone = {}, blink: boolean) {
  const closed = blink || bone.blink || bone.wink === side;
  const look = bone.look as string | undefined;
  let x: number | string | string[] = 0;
  let y: number | string = 0;
  if (look === "left") x = "-12%";
  if (look === "right") x = "12%";
  if (look === "up") y = "-18%";
  if (look === "down") y = "18%";
  if (bone.scan || bone.follow) x = ["-12%", "12%", "-12%"];
  const scanning = Array.isArray(x);
  return { animate: { x, y, scaleY: closed ? 0.08 : 1 }, transition: closed ? { duration: 0.12, ease: "easeInOut" } : scanning ? { duration: 1.8, ease: "easeInOut", repeat: Infinity } : SPRING };
}

export default function JIA({ speaking, gesture = "welcome", auto = true, move: requestedMove }: Props) {
  const reduced = !!useReducedMotion();
  const blink = useBlink(!reduced);
  const [move, setMove] = useState<JIA100Move>("idle");
  const [clip, setClip] = useState<JIA100Move | null>(null);
  const [talk, setTalk] = useState(false);
  const [voiceViseme, setVoiceViseme] = useState<"neutral" | "small" | "open" | "round" | "wide" | "smile">("neutral");
  const [outfit, setOutfit] = useState<JIAOutfit>("blue");
  const until = useRef(0);
  const idx = useRef(0);
  const lastClipAt = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const outfitVideoRef = useRef<HTMLVideoElement | null>(null);
  const contextual = useMemo(() => GESTURE_MOVE[gesture] ?? "idle", [gesture]);

  useEffect(() => {
    const sync = () => setOutfit(getJIAOutfit());
    sync();
    const timer = window.setInterval(sync, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onVoice = (event: Event) => {
      const detail = (event as CustomEvent<{ active?: boolean; viseme?: typeof voiceViseme }>).detail;
      if (!detail?.active) { setVoiceViseme("neutral"); setTalk(false); return; }
      setVoiceViseme(detail.viseme ?? "small"); setTalk(true);
    };
    window.addEventListener("jobly:jia-voice", onVoice);
    return () => window.removeEventListener("jobly:jia-voice", onVoice);
  }, []);

  const rigMove = RIG_MOVES[moveKey(move)] ?? RIG_MOVES[RIG_PREFIX.get("idle")!];
  const duration = Number(rigMove?.duration ?? 0.7);
  const bones = useMemo(() => rigMove ?? {}, [rigMove]);

  const play = useCallback((next: JIA100Move, explicit: boolean, holdMs = 1400) => {
    setMove(next);
    until.current = Date.now() + holdMs;
    const cfg = JIA_CLIPS[next];
    if (!cfg || reduced || outfit !== "blue") return;
    const now = Date.now();
    if (!explicit && now - lastClipAt.current < CLIP_COOLDOWN_MS) return;
    lastClipAt.current = now;
    until.current = now + cfg.duration * 1000 + 600;
    setClip(next);
  }, [reduced, outfit]);

  const endClip = useCallback(() => { setClip(null); setMove("idle"); }, []);

  useEffect(() => { preloadClips(); }, []);
  useEffect(() => { play(requestedMove ?? contextual, Boolean(requestedMove)); }, [contextual, requestedMove, play]);

  useEffect(() => {
    if (!auto || reduced) return;
    const timer = window.setInterval(() => {
      if (Date.now() < until.current) return;
      idx.current = (idx.current + 1) % AUTO.length;
      play(AUTO[idx.current], false, 3900);
    }, 1200);
    return () => window.clearInterval(timer);
  }, [auto, reduced, play]);

  useEffect(() => {
    const onMove = (event: Event) => {
      const next = (event as CustomEvent<{ move?: JIA100Move }>).detail?.move;
      if (next && JIA_100_MOVES.includes(next)) play(next, true, 4500);
    };
    window.addEventListener("jobly:jia-move", onMove);
    return () => window.removeEventListener("jobly:jia-move", onMove);
  }, [play]);

  useEffect(() => {
    if (!speaking) { setTalk(false); setVoiceViseme("neutral"); return; }
    const sequence: Array<typeof voiceViseme> = ["small", "wide", "open", "small", "round", "neutral"];
    let i = 0;
    const timer = window.setInterval(() => { setTalk(true); setVoiceViseme(sequence[i++ % sequence.length]); }, 105);
    return () => window.clearInterval(timer);
  }, [speaking]);

  const outfitVideoMode = outfit !== "blue" && !clip;
  const outfitCfg = JIA_OUTFITS[outfit];

  useEffect(() => { if (outfit !== "blue" && clip) setClip(null); }, [outfit, clip]);
  useEffect(() => {
    if (!outfitVideoMode) return;
    const v = outfitVideoRef.current; if (!v) return;
    v.currentTime = 0; v.play().catch(() => {});
  }, [outfitVideoMode, outfit]);

  useEffect(() => {
    if (!clip) return;
    const v = videoRef.current; if (!v) return;
    v.currentTime = 0; v.play().catch(endClip);
  }, [clip, endClip]);

  const clipCfg = clip ? JIA_CLIPS[clip] : undefined;
  const hideBody = Boolean(clipCfg) || outfitVideoMode;
  const eyeBone = bones.eyes ?? {};
  const eyeL = eyeAnimation("left", eyeBone, blink);
  const eyeR = eyeAnimation("right", eyeBone, blink);
  const mouthBone: Bone = bones.mouth ?? {};
  const mouthOpen = mouthBone.open ? 1.25 : 1;
  const mouthFile = speaking ? ({ neutral: "mouth_neutral.svg", small: "mouth_small.svg", open: "mouth_open.svg", round: "mouth_round.svg", wide: "mouth_wide.svg", smile: "mouth_smile.svg" } as const)[voiceViseme] : (move === "smile_wide" || move === "smile_soft" || move === "proud" ? "mouth_smile.svg" : "mouth_neutral.svg");
  const mouthAnimate = { scaleY: (mouthBone.scaleY ?? 1) * mouthOpen, scaleX: mouthBone.scaleX ?? 1, scale: mouthBone.scale ?? 1 };
  const mouthTransition = speaking ? { duration: 0.09, ease: "easeOut" as const } : SPRING;
  const eyebrowBone: Bone = bones.eyebrows ?? {};
  const torsoBone: Bone = bones.torso ?? {};
  const breathe = reduced ? 0 : Number(torsoBone.breathe ?? BREATH);

  return <div className="relative flex h-full w-full select-none justify-center overflow-visible" aria-label={`J’IA — ${clip ?? (outfitVideoMode ? outfitCfg.label : move)}`}>
    <div className="relative h-full" style={{ aspectRatio: `${CANVAS.width} / ${CANVAS.height}`, perspective: 1100, transformStyle: "preserve-3d" }}>
      <img src="/jia/jia-master.png" alt="J’IA, l’assistante intelligente de Jobly" className="absolute inset-0 h-full w-full object-contain pointer-events-none" />
      <BoneGroup pivot={PIVOT.torso} bone={torsoBone} duration={duration} opacity={hideBody ? 0 : 1}>
        <motion.div className="absolute inset-0 pointer-events-none" style={{ transformOrigin: `${PIVOT.torso.x}% ${PIVOT.torso.y}%` }} animate={breathe ? { scaleY: [1, 1 + breathe, 1] } : { scaleY: 1 }} transition={breathe ? { duration: 3.2, ease: "easeInOut", repeat: Infinity } : undefined}>
          <Sprite name="torso" />
          <BoneGroup pivot={PIVOT.scarf} bone={bones.scarf} duration={duration}><Sprite name="scarf" /></BoneGroup>
          <BoneGroup pivot={PIVOT.arm_L} bone={bones.arm_L} duration={duration}><Sprite name="arm_L" /><BoneGroup pivot={PIVOT.hand_L} bone={bones.hand_L} duration={duration}><Sprite name="hand_L" /></BoneGroup></BoneGroup>
          <BoneGroup pivot={PIVOT.arm_R} bone={bones.arm_R} duration={duration}><Sprite name="arm_R" /><BoneGroup pivot={PIVOT.hand_R} bone={bones.hand_R} duration={duration}><Sprite name="hand_R" /></BoneGroup></BoneGroup>
        </motion.div>
      </BoneGroup>

      <BoneGroup pivot={PIVOT.head} bone={bones.head} duration={duration} opacity={hideBody ? 0 : 1}>
        <Sprite name="head" /><Sprite name="hair" /><Sprite name="glasses" />
        <Sprite name="eyebrows" animate={{ y: eyebrowBone.y ?? 0 }} transition={SPRING} />
        <Sprite name="eye_L" animate={eyeL.animate} transition={eyeL.transition} /><Sprite name="eye_R" animate={eyeR.animate} transition={eyeR.transition} />
        <Sprite name="mouth" srcOverride={`${RIG_SRC}/mouth/${mouthFile}`} animate={mouthAnimate} transition={mouthTransition} />
      </BoneGroup>

      <AnimatePresence>{outfitVideoMode && <motion.video key={`outfit-${outfit}`} ref={outfitVideoRef} className="absolute inset-0 h-full w-full object-cover pointer-events-none" style={{ zIndex: 30, background: "#000" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} muted playsInline autoPlay loop preload="metadata" poster={outfitCfg.poster} aria-label={`J’IA — ${outfitCfg.label}`}><source src={outfitCfg.video} type="video/webm" /><source src={outfitCfg.mp4} type="video/mp4" /></motion.video>}</AnimatePresence>

      <AnimatePresence>{clipCfg && <motion.video key={clip} ref={videoRef} className="absolute pointer-events-none" style={{ left: `${clipCfg.fit.left}%`, top: `${clipCfg.fit.top}%`, width: `${clipCfg.fit.width}%`, aspectRatio: "1 / 1", zIndex: 20, transformOrigin: `50% ${clipCfg.fit.originY}%`, WebkitMaskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)", maskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)" }} initial={{ opacity: 0, scale: clipCfg.fit.scaleFrom }} animate={{ opacity: 1, scale: [clipCfg.fit.scaleFrom, clipCfg.fit.scaleTo] }} exit={{ opacity: 0 }} transition={{ opacity: { duration: 0.18 }, scale: { duration: clipCfg.duration, ease: "linear" } }} muted playsInline autoPlay preload="auto" aria-hidden="true" onEnded={endClip} onError={endClip}>{pickClipSources(clipCfg).map((s) => <source key={s.src} src={s.src} type={s.type} />)}</motion.video>}</AnimatePresence>
    </div>
  </div>;
}

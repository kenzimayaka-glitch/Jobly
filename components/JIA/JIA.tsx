"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { JIA_100_MOVES, type JIA100Move } from "./movements";
import rig from "./JIA_Rig.json";
import { CANVAS, LAYOUT, PIVOT, RIG_SRC, type LayerName } from "./rigLayout";
import { JIA_OUTFITS } from "./outfits";

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

function proceduralMove(move: JIA100Move): RigMove {
  const nod = move.startsWith("nod_") ? { rz: [0, -3, 3, 0] } : {};
  const wave = move === "wave_hi" || move === "wave_bye";
  const point = move.startsWith("point_");
  const explain = move.startsWith("explain_") || move === "heart" || move === "clap";
  const expressive = move === "celebrate_jump" || move === "celebrate_fist" || move === "proud";
  return {
    duration: move === "idle" ? 3.2 : 0.85,
    head: nod,
    torso: expressive ? { y: [0, -14, 0], scale: [1, 1.025, 1] } : { y: [0, -3, 0] },
    arm_L: wave ? { rz: [0, -18, 18, -8, 0] } : point ? { rz: [-2, -12, -2] } : explain ? { rz: [0, -10, 10, 0] } : { rz: [0, -2, 2, 0] },
    arm_R: wave ? { rz: [0, 18, -18, 8, 0] } : point ? { rz: [2, 12, 2] } : explain ? { rz: [0, 10, -10, 0] } : { rz: [0, 2, -2, 0] },
    hand_L: wave ? { rz: [0, 14, -14, 0] } : {},
    hand_R: wave ? { rz: [0, -14, 14, 0] } : {},
  };
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
  const style: CSSProperties = { position: "absolute", left: `${l.left}%`, top: `${l.top}%`, width: `${l.width}%`, height: `${l.height}%`, maxWidth: "none", transformOrigin: "50% 50%" };
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
  const [talk, setTalk] = useState(false);
  const [voiceViseme, setVoiceViseme] = useState<"neutral" | "small" | "open" | "round" | "wide" | "smile">("neutral");
  const until = useRef(0);
  const idx = useRef(0);
  const contextual = useMemo(() => GESTURE_MOVE[gesture] ?? "idle", [gesture]);

  useEffect(() => {
    const onVoice = (event: Event) => {
      const detail = (event as CustomEvent<{ active?: boolean; viseme?: typeof voiceViseme }>).detail;
      if (!detail?.active) { setVoiceViseme("neutral"); setTalk(false); return; }
      setVoiceViseme(detail.viseme ?? "small"); setTalk(true);
    };
    window.addEventListener("jobly:jia-voice", onVoice);
    return () => window.removeEventListener("jobly:jia-voice", onVoice);
  }, []);

  const rigMove = RIG_MOVES[moveKey(move)] ?? {};
  const duration = Number(rigMove.duration ?? 0.85);
  const bones = useMemo(() => ({ ...proceduralMove(move), ...rigMove }), [move, rigMove]);

  const play = useCallback((next: JIA100Move, explicit: boolean, holdMs = 1400) => {
    setMove(next);
    until.current = Date.now() + holdMs;
    // The movement is rendered by the layered rig. Clip videos can contain opaque
    // backgrounds on mobile browsers, so they must never replace the rig surface.
    return;
  }, []);

  useEffect(() => { play(requestedMove ?? contextual, Boolean(requestedMove)); }, [contextual, requestedMove, play]);

  useEffect(() => {
    if (!auto) return;
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

  // Keep the transparent layered rig as the only renderer. Outfit videos can
  // fall back to an opaque black frame while a movement changes state.
  const outfitVideoMode = false;
  const outfitCfg = JIA_OUTFITS.blue;

  const hideBody = outfitVideoMode;
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

  return <div className="relative flex h-full w-full select-none justify-center overflow-visible" aria-label={`J’IA — ${outfitVideoMode ? outfitCfg.label : move}`}>
    <motion.div
      className="relative h-full"
      style={{ aspectRatio: `${CANVAS.width} / ${CANVAS.height}`, perspective: 1100, transformStyle: "preserve-3d" }}
      animate={{
        y: [0, -4, 0, 3, 0],
        rotate: move === "wave_hi" || move === "explain_open" ? [0, -2.5, 2.5, -1.5, 0] : [0, 0.8, 0, -0.8, 0],
        scale: move === "celebrate_jump" ? [1, 1.05, 1] : [1, 1.012, 1],
      }}
      transition={{
        y: { duration: speaking ? 0.8 : 3.2, ease: "easeInOut", repeat: Infinity },
        rotate: { duration: move === "wave_hi" ? 1.1 : 3.2, ease: "easeInOut", repeat: Infinity },
        scale: { duration: 0.9, ease: "easeInOut", repeat: Infinity },
      }}
    >
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
        <Sprite name="mouth" srcOverride={`${RIG_SRC}/mouth.webp`} animate={mouthAnimate} transition={mouthTransition} />
      </BoneGroup>


    </motion.div>
  </div>;
}

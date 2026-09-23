"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { JIA_100_MOVES, type JIA100Move } from "./movements";
import rig from "./JIA_Rig.json";
import { CANVAS, PIVOT, layoutFor, type LayerName } from "./rigLayout";
import { OUTFIT_HAS_CLIPS, OUTFIT_HAS_LIMBS, OUTFIT_HAS_SCARF, type Outfit } from "@/lib/jia/outfit";
import { CLIP_COOLDOWN_MS, clipConfig, pickClipKey, pickClipSources, preloadClips } from "./clips";

export type JIAMove = JIA100Move;
type Props = { speaking: boolean; gesture?: string; auto?: boolean; move?: JIA100Move; /** Tenue courante (par défaut bleue) — voir lib/jia/outfit.ts. */ outfit?: Outfit };
type Bone = Record<string, any>;
type RigMove = { duration?: number; [bone: string]: any };

const RIG_MOVES = rig.moves as Record<string, RigMove>;
const RIG_PREFIX = new Map(Object.keys(RIG_MOVES).map((key) => [key.replace(/^\d+_/, ""), key]));

const GESTURE_MOVE: Record<string, JIA100Move> = {
  welcome: "wave_hi", validate: "ok", reassure: "scarf_touch", encourage: "clap", analyze: "scanning",
  curious: "searching", "present-chart": "chart_up", filter: "point_button", point: "point_button", apply: "reading",
  "call-hr": "point_you", handshake: "hand_shake", "present-team": "explain_wide", "pay-os": "money", alert: "stop",
  secure: "hand_chest", goodbye: "wave_bye", disappointed: "think_doubt", tired: "breathe_deep", surprised: "eyebrow_raise", celebrate: "celebrate_jump",
  proud: "hand_chest", wink: "wink_left", write: "writing",
};

const AUTO: JIA100Move[] = [
  "idle", "blink_slow", "smile_soft", "look_around", "nod_slow", "think_chin", "point_button",
  "scarf_adjust", "explain_open", "celebrate_fist", "listen_tilt", "reading", "matching", "proud",
];

const SPRING = { type: "spring", stiffness: 150, damping: 18, mass: 0.55 } as const;
const BREATH = 0.012; // respiration douce permanente (le JSON peut l'augmenter via torso.breathe)

function moveKey(move: JIA100Move) {
  return RIG_PREFIX.get(move) ?? RIG_PREFIX.get("idle")!;
}

/** Convertit un « os » du JSON en transformation framer-motion. Les valeurs peuvent être des tableaux (keyframes). */
function transformOf(bone: Bone = {}) {
  return {
    x: bone.x ?? 0,
    y: bone.y ?? 0,
    z: bone.z ?? 0,
    rotate: bone.rz ?? bone.rotate ?? 0,
    rotateX: bone.rx ?? bone.rotateX ?? 0,
    rotateY: bone.ry ?? bone.rotateY ?? 0,
    scale: bone.scale ?? 1,
  };
}

function transitionOf(values: Record<string, any>, bone: Bone = {}, duration = 0.7) {
  // Un ressort ne sait pas animer des keyframes multiples (ex. hochement [0, 10, 0]) : on passe en tween.
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
        setTimeout(() => {
          if (dead) return;
          setBlink(false);
          if (Math.random() < 0.16) {
            setTimeout(() => {
              if (dead) return;
              setBlink(true);
              setTimeout(() => !dead && setBlink(false), 95);
            }, 120);
          }
        }, 105);
        next();
      }, 2300 + Math.random() * 3200);
    };
    next();
    return () => { dead = true; clearTimeout(timer); };
  }, [enabled]);
  return blink;
}

/** Un os = un groupe qui pivote autour de son articulation ; tout ce qu'il contient le suit. */
function BoneGroup({
  pivot, bone, duration, opacity = 1, children,
}: {
  pivot: { x: number; y: number }; bone?: Bone; duration: number; opacity?: number; children: ReactNode;
}) {
  const values = transformOf(bone);
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{ transformOrigin: `${pivot.x}% ${pivot.y}%`, transformStyle: "preserve-3d" }}
      animate={{ ...values, opacity }}
      transition={transitionOf(values, bone, duration)}
    >
      {children}
    </motion.div>
  );
}

/** Calque recadré, positionné en % du canvas. Les animations propres au calque (yeux, bouche…) s'y ajoutent. */
function Sprite({
  name, layout, animate, transition,
}: {
  name: LayerName; layout: Record<LayerName, { file: string; left: number; top: number; width: number; height: number }>; animate?: Record<string, any>; transition?: Record<string, any>;
}) {
  const l = layout[name];
  const style: CSSProperties = {
    position: "absolute", left: `${l.left}%`, top: `${l.top}%`, width: `${l.width}%`, height: `${l.height}%`,
    maxWidth: "none", transformOrigin: "50% 50%",
  };
  return (
    <motion.img
      src={l.file}
      alt=""
      draggable={false}
      className="select-none pointer-events-none"
      style={style}
      animate={animate}
      transition={transition}
    />
  );
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
  return {
    animate: { x, y, scaleY: closed ? 0.08 : 1 },
    transition: closed
      ? { duration: 0.12, ease: "easeInOut" }
      : scanning
        ? { duration: 1.8, ease: "easeInOut", repeat: Infinity }
        : SPRING,
  };
}

export default function JIA({ speaking, gesture = "welcome", auto = true, move: requestedMove, outfit = "blue" }: Props) {
  const layout = useMemo(() => layoutFor(outfit), [outfit]);
  const hasScarf = OUTFIT_HAS_SCARF[outfit];
  const hasLimbs = OUTFIT_HAS_LIMBS[outfit];
  const outfitHasClips = OUTFIT_HAS_CLIPS[outfit];
  const reduced = !!useReducedMotion();
  const blink = useBlink(!reduced);
  const [move, setMove] = useState<JIA100Move>("idle");
  const [clip, setClip] = useState<string | null>(null);
  const [talk, setTalk] = useState(false);
  const until = useRef(0);
  const idx = useRef(0);
  const lastClipAt = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const contextual = useMemo(() => GESTURE_MOVE[gesture] ?? "idle", [gesture]);
  const rigMove = RIG_MOVES[moveKey(move)] ?? RIG_MOVES[RIG_PREFIX.get("idle")!];
  const duration = Number(rigMove?.duration ?? 0.7);
  const bones = useMemo(() => rigMove ?? {}, [rigMove]);

  /**
   * Joue un geste : clip vidéo s'il en existe un (d'abord au nom du geste contextuel, puis au nom du mouvement),
   * sinon rig. `explicit` ignore le délai de répétition.
   */
  const play = useCallback((next: JIA100Move, explicit: boolean, holdMs = 1400, gestureName?: string) => {
    setMove(next);
    until.current = Date.now() + holdMs;
    const key = outfitHasClips ? pickClipKey(gestureName, outfit) ?? pickClipKey(next, outfit) : undefined;
    const cfg = key ? clipConfig(key, outfit) : undefined;
    if (!key || !cfg || reduced) return;
    const now = Date.now();
    if (!explicit && now - lastClipAt.current < CLIP_COOLDOWN_MS) return;
    lastClipAt.current = now;
    until.current = now + cfg.duration * 1000 + 600;
    setClip(key);
  }, [reduced, outfitHasClips, outfit]);

  const endClip = useCallback(() => {
    setClip(null);
    setMove("idle");
  }, []);

  useEffect(() => { if (outfitHasClips) preloadClips(outfit); }, [outfitHasClips, outfit]);

  useEffect(() => {
    play(requestedMove ?? contextual, Boolean(requestedMove), 1400, requestedMove ? undefined : gesture);
  }, [contextual, requestedMove, gesture, play]);

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
    if (!speaking) { setTalk(false); return; }
    const timer = window.setInterval(() => setTalk((value) => !value), 125);
    const gestureTimer = window.setInterval(() => {
      if (Date.now() < until.current) return;
      play(Math.random() > 0.45 ? "explain_open" : "listen_tilt", false, 2600);
    }, 2800);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(gestureTimer);
    };
  }, [play, speaking]);

  // Lecture du clip : si le navigateur refuse l'autoplay ou la vidéo, on retombe sur le rig.
  useEffect(() => {
    if (!clip) return;
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(endClip);
  }, [clip, endClip]);

  const clipCfg = clip ? clipConfig(clip, outfit) : undefined;
  const hideBody = Boolean(clipCfg); // pendant un clip, la vidéo remplace tout le buste du rig

  const eyeBone = bones.eyes ?? {};
  const eyeL = eyeAnimation("left", eyeBone, blink);
  const eyeR = eyeAnimation("right", eyeBone, blink);

  const mouthBone: Bone = bones.mouth ?? {};
  const mouthOpen = mouthBone.open ? 1.25 : 1;
  const mouthAnimate = speaking
    ? { scaleY: [0.72, 1.28, 0.78, 1.12, 0.72], scaleX: [0.96, 1.06, 0.94, 1.02, 0.96], scale: 1 }
    : { scaleY: (mouthBone.scaleY ?? 1) * mouthOpen, scaleX: mouthBone.scaleX ?? 1, scale: mouthBone.scale ?? 1 };
  const mouthTransition = speaking
    ? { duration: 0.16, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" as const }
    : SPRING;
  const torsoAnimate = speaking
    ? { scaleY: [1, 1 + BREATH * 1.8, 1], y: [0, -0.8, 0] }
    : { scaleY: [1, 1 + BREATH, 1], y: [0, -0.35, 0] };

  const eyebrowBone: Bone = bones.eyebrows ?? {};
  const torsoBone: Bone = bones.torso ?? {};

  return (
    <div
      className="relative flex h-full w-full select-none justify-center overflow-visible"
      aria-label={`J’IA — ${clip ?? move}`}
    >
      {/* Canvas du rig : proportions d'origine 1408×1472 (les calques ne sont plus étirés). */}
      <div
        className="relative h-full"
        style={{ aspectRatio: `${CANVAS.width} / ${CANVAS.height}`, perspective: 1100, transformStyle: "preserve-3d" }}
      >
        {/* Corps : torse (respiration), foulard, bras et mains solidaires de leur bras */}
        <BoneGroup pivot={PIVOT.torso} bone={torsoBone} duration={duration} opacity={hideBody ? 0 : 1}>
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ transformOrigin: `${PIVOT.torso.x}% ${PIVOT.torso.y}%` }}
            animate={reduced ? { scaleY: 1 } : torsoAnimate}
            transition={reduced ? undefined : { duration: speaking ? 1.15 : 3.2, ease: "easeInOut", repeat: Infinity }}
          >
            <Sprite name="torso" layout={layout} />
            {hasScarf && (
              <BoneGroup pivot={PIVOT.scarf} bone={bones.scarf} duration={duration}>
                <Sprite name="scarf" layout={layout} />
              </BoneGroup>
            )}
            {/* hasLimbs=false (débardeur jaune, faute d'assets — voir outfits/yellow/README.md) :
                les bras restent absents plutôt que d'afficher un fichier manquant. */}
            {hasLimbs && (
              <>
                <BoneGroup pivot={PIVOT.arm_L} bone={bones.arm_L} duration={duration} opacity={hideBody ? 0 : 1}>
                  <Sprite name="arm_L" layout={layout} />
                  <BoneGroup pivot={PIVOT.hand_L} bone={bones.hand_L} duration={duration}>
                    <Sprite name="hand_L" layout={layout} />
                  </BoneGroup>
                </BoneGroup>
                <BoneGroup pivot={PIVOT.arm_R} bone={bones.arm_R} duration={duration} opacity={hideBody ? 0 : 1}>
                  <Sprite name="arm_R" layout={layout} />
                  <BoneGroup pivot={PIVOT.hand_R} bone={bones.hand_R} duration={duration}>
                    <Sprite name="hand_R" layout={layout} />
                  </BoneGroup>
                </BoneGroup>
              </>
            )}
          </motion.div>
        </BoneGroup>

        {/* Tête : cheveux, lunettes, sourcils, yeux et bouche pivotent ensemble autour du cou */}
        <BoneGroup pivot={PIVOT.head} bone={bones.head} duration={duration} opacity={hideBody ? 0 : 1}>
          <Sprite name="head" layout={layout} />
          <Sprite name="hair" layout={layout} />
          <Sprite name="glasses" layout={layout} />
          <Sprite name="eyebrows" layout={layout} animate={{ y: eyebrowBone.y ?? 0 }} transition={SPRING} />
          <Sprite name="eye_L" layout={layout} animate={eyeL.animate} transition={eyeL.transition} />
          <Sprite name="eye_R" layout={layout} animate={eyeR.animate} transition={eyeR.transition} />
          <Sprite name="mouth" layout={layout} animate={mouthAnimate} transition={mouthTransition} />

          {/* Cavité buccale pendant la parole (indépendante des lèvres) */}
          <motion.span
            aria-hidden="true"
            className="absolute rounded-[50%] bg-[#3a1718] pointer-events-none"
            style={{ left: "45.4%", top: "34.8%", width: "9.4%", height: "2.3%", transformOrigin: "50% 50%" }}
            animate={{
              scaleY: speaking ? (talk ? 1.55 : 0.62) : 0.35,
              scaleX: speaking ? (talk ? 1.05 : 0.9) : 0.72,
              opacity: speaking ? 0.92 : 0,
            }}
            transition={{ duration: 0.12, ease: "easeInOut" }}
          />
        </BoneGroup>

        {/* Clip vidéo des grands gestes (transparent en WebM ; MP4 fond blanc pour Safari) */}
        <AnimatePresence>
          {clipCfg && (
            <motion.video
              key={clip}
              ref={videoRef}
              className="absolute pointer-events-none"
              style={{
                left: `${clipCfg.fit.left}%`, top: `${clipCfg.fit.top}%`, width: `${clipCfg.fit.width}%`,
                aspectRatio: "1 / 1", zIndex: 20, transformOrigin: `50% ${clipCfg.fit.originY}%`,
                // fondu du bas du clip : pas de coupure nette sur le buste
                WebkitMaskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)",
                maskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)",
              }}
              initial={{ opacity: 0, scale: clipCfg.fit.scaleFrom }}
              animate={{ opacity: 1, scale: [clipCfg.fit.scaleFrom, clipCfg.fit.scaleTo] }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.18 },
                scale: { duration: clipCfg.duration, ease: "linear" },
              }}
              muted
              playsInline
              autoPlay
              preload="auto"
              aria-hidden="true"
              onEnded={endClip}
              onError={endClip}
            >
              {pickClipSources(clipCfg).map((s) => <source key={s.src} src={s.src} type={s.type} />)}
            </motion.video>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

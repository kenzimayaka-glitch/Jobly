"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

export type JIAMove =
  | "idle"
  | "blink"
  | "nod"
  | "point"
  | "think"
  | "hair"
  | "celebrate"
  | "listen";

type Props = {
  speaking: boolean;
  gesture?: string;
  auto?: boolean;
};

const GESTURE_MOVE: Record<string, JIAMove> = {
  welcome: "nod",
  validate: "nod",
  reassure: "listen",
  encourage: "nod",
  analyze: "think",
  curious: "think",
  "present-chart": "think",
  filter: "point",
  point: "point",
  apply: "point",
  "call-hr": "point",
  handshake: "point",
  "present-team": "point",
  "pay-os": "point",
  alert: "listen",
  secure: "listen",
  disappointed: "hair",
  tired: "hair",
  surprised: "celebrate",
  celebrate: "celebrate",
  proud: "celebrate",
  wink: "blink",
};

const AUTO_SEQUENCE: JIAMove[] = [
  "idle",
  "nod",
  "point",
  "think",
  "hair",
  "celebrate",
  "listen",
];

const HEAD: Record<JIAMove, { x: number; y: number; rotate: number; scale: number }> = {
  idle: { x: 0, y: 0, rotate: 0, scale: 1 },
  blink: { x: 0, y: 0, rotate: 0, scale: 1 },
  nod: { x: 0, y: 5, rotate: 0, scale: 1.005 },
  point: { x: 7, y: -2, rotate: 1.4, scale: 1.015 },
  think: { x: -4, y: -1, rotate: -1.5, scale: 0.992 },
  hair: { x: -4, y: 2, rotate: 2, scale: 1.005 },
  celebrate: { x: 0, y: -7, rotate: 0, scale: 1.045 },
  listen: { x: 3, y: 1, rotate: 3, scale: 1.012 },
};

const EYE = {
  left: { x: 43.8, y: 25.4 },
  right: { x: 58.7, y: 25.5 },
  width: 4.9,
  height: 2.0,
};

function useBlink() {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        if (cancelled) return;
        setBlink(true);
        setTimeout(() => !cancelled && setBlink(false), 115);
        schedule();
      }, 2200 + Math.random() * 3000);
    };
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  return blink;
}

export default function JIA({ speaking, gesture = "welcome", auto = true }: Props) {
  const reduced = useReducedMotion();
  const blink = useBlink();
  const [move, setMove] = useState<JIAMove>("idle");
  const [talk, setTalk] = useState(false);
  const indexRef = useRef(0);
  const overrideUntil = useRef(0);
  const talkTimer = useRef<number | null>(null);

  const contextualMove = useMemo(() => GESTURE_MOVE[gesture] ?? "idle", [gesture]);

  useEffect(() => {
    setMove(contextualMove);
    overrideUntil.current = Date.now() + 4200;
  }, [contextualMove]);

  useEffect(() => {
    if (!auto || reduced) return;
    const timer = window.setInterval(() => {
      if (Date.now() < overrideUntil.current) return;
      indexRef.current = (indexRef.current + 1) % AUTO_SEQUENCE.length;
      setMove(AUTO_SEQUENCE[indexRef.current]);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [auto, reduced]);

  useEffect(() => {
    const onMove = (event: Event) => {
      const requested = (event as CustomEvent<{ move?: JIAMove }>).detail?.move;
      if (!requested || !AUTO_SEQUENCE.includes(requested) && requested !== "blink") return;
      setMove(requested);
      overrideUntil.current = Date.now() + 4200;
    };
    window.addEventListener("jobly:jia-move", onMove);
    return () => window.removeEventListener("jobly:jia-move", onMove);
  }, []);

  useEffect(() => {
    if (!speaking) {
      setTalk(false);
      return;
    }
    talkTimer.current = window.setInterval(() => setTalk((v) => !v), 125);
    return () => {
      if (talkTimer.current !== null) window.clearInterval(talkTimer.current);
      talkTimer.current = null;
    };
  }, [speaking]);

  const head = HEAD[move];

  return (
    <motion.div
      className="relative h-full w-full select-none overflow-visible"
      aria-label="J’IA — personnage animé de Jobly"
      animate={reduced ? undefined : head}
      transition={{
        duration: move === "celebrate" ? 0.55 : move === "nod" ? 0.38 : 0.5,
        ease: "easeInOut",
      }}
    >
      <motion.img
        src="/jia/jia-master.png"
        alt="J’IA"
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain object-center"
        animate={
          reduced
            ? undefined
            : move === "idle"
              ? { scale: [1, 1.012, 1], y: [0, -1, 0] }
              : move === "celebrate"
                ? { y: [0, -7, 0, -5, 0], rotate: [0, -2, 2, -1, 0] }
                : move === "point"
                  ? { x: [0, 7, 4, 7, 0] }
                  : move === "nod"
                    ? { y: [0, 5, 0] }
                    : move === "listen"
                      ? { rotate: [0, 3, 0] }
                      : move === "hair"
                        ? { x: [0, -4, 0], rotate: [0, 2, 0] }
                        : move === "think"
                          ? { x: [0, -3, 0], rotate: [0, -1.5, 0] }
                          : undefined
        }
        transition={{
          duration: move === "celebrate" ? 1.1 : move === "idle" ? 3 : 0.8,
          repeat: move === "idle" ? Infinity : 0,
          ease: "easeInOut",
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          left: `${EYE.left.x}%`,
          top: `${EYE.left.y}%`,
          width: `${EYE.width}%`,
          height: `${EYE.height}%`,
          transform: "translate(-50%,-50%)",
        }}
      >
        <motion.span
          className="absolute left-[28%] top-1/2 h-[20%] w-[12%] -translate-y-1/2 rounded-full bg-[#17212B]"
          animate={
            reduced
              ? undefined
              : move === "think"
                ? { x: [0, 2, 4, 2, 0] }
                : move === "point"
                  ? { x: [0, 1, 0] }
                  : { x: [0, 1.5, 0, -0.8, 0] }
          }
          transition={{ duration: move === "think" ? 2.4 : 4.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          left: `${EYE.right.x}%`,
          top: `${EYE.right.y}%`,
          width: `${EYE.width}%`,
          height: `${EYE.height}%`,
          transform: "translate(-50%,-50%)",
        }}
      >
        <motion.span
          className="absolute left-[28%] top-1/2 h-[20%] w-[12%] -translate-y-1/2 rounded-full bg-[#17212B]"
          animate={
            reduced
              ? undefined
              : move === "think"
                ? { x: [0, 2, 4, 2, 0] }
                : move === "point"
                  ? { x: [0, -1, 0] }
                  : { x: [0, -1.5, 0, 0.8, 0] }
          }
          transition={{ duration: move === "think" ? 2.4 : 5.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-[36.5%] top-[24.6%] h-[2.2%] w-[29%] rounded-full bg-[#9A5B3E]"
        animate={{ scaleY: blink ? 1 : 0.08, opacity: blink ? 0.9 : 0 }}
        transition={{ duration: 0.07 }}
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-[51.2%] top-[38.3%] h-[2.4%] w-[8.8%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-[#6B302B]/70 bg-[#8E3F3B]/25"
        animate={{
          scaleX: speaking ? (talk ? 1.12 : 0.88) : 0.86,
          scaleY: speaking ? (talk ? 1.22 : 0.78) : 0.55,
          opacity: speaking ? 0.65 : 0,
        }}
        transition={{ duration: 0.09, ease: "easeOut" }}
      />
    </motion.div>
  );
}

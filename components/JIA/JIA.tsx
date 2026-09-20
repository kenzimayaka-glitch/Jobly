"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { JIA_100_MOVES, type JIA100Move } from "./movements";

export type JIAMove = JIA100Move;

type Props = {
  speaking: boolean;
  gesture?: string;
  auto?: boolean;
  move?: JIA100Move;
};

const GESTURE_MOVE: Record<string, JIA100Move> = {
  welcome: "wave_hi", validate: "stamping", reassure: "calm_down", encourage: "nod_slow",
  analyze: "scanning", curious: "look_around", "present-chart": "chart_up", filter: "point_button",
  point: "point_button", apply: "point_cv", "call-hr": "point_you", handshake: "hand_shake",
  "present-team": "explain_wide", "pay-os": "money", alert: "stop", secure: "hand_chest",
  disappointed: "think_doubt", tired: "breathe_deep", surprised: "eyebrow_raise",
  celebrate: "celebrate_jump", proud: "proud", wink: "wink_left", write: "writing",
};

const AUTO_SEQUENCE: JIA100Move[] = [
  "idle","blink_slow","smile_soft","look_around","nod_slow","think_chin",
  "point_button","scarf_adjust","explain_open","celebrate_fist","listen_tilt",
  "reading","matching","proud",
];

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
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);
  return blink;
}

function motionFor(move: JIA100Move) {
  if (move.startsWith("blink") || move.startsWith("wink")) return { scaleY: [1, 0.97, 1] };
  if (move.startsWith("nod")) return { y: [0, 6, 0, 4, 0] };
  if (move.startsWith("shake_no")) return { rotate: [0, -4, 4, -3, 0] };
  if (move.startsWith("point_")) return { x: [0, 7, 3, 7, 0], rotate: [0, 1.5, -1, 1, 0] };
  if (move === "celebrate_jump" || move === "rocket") return { y: [0, -10, 0, -6, 0], rotate: [0, -2, 2, -1, 0] };
  if (move === "proud" || move === "hand_chest") return { scale: [1, 1.045, 1] };
  if (move === "listen_tilt" || move === "lean_in") return { x: [0, 5, 0], rotate: [0, 5, 0] };
  if (move.startsWith("think_")) return { x: [0, -4, 0], rotate: [0, -2, 0], scale: [1, .99, 1] };
  if (move.startsWith("hair_") || move.startsWith("scarf_") || move.startsWith("glasses_")) return { x: [0, -4, 0], rotate: [0, 2, 0] };
  if (move.startsWith("wave_")) return { x: [0, 5, -5, 5, 0], rotate: [0, 3, -3, 2, 0] };
  if (move.startsWith("explain_")) return { x: [0, -5, 5, 0], scale: [1, 1.02, 1.02, 1] };
  if (move === "breathe_deep" || move === "stretch") return { scale: [1, 1.055, 1] };
  if (move === "focus" || move === "scanning" || move === "magnify") return { scale: [1, .985, 1] };
  if (move === "confused" || move === "think_doubt") return { rotate: [0, -3, 2, 0] };
  if (move === "typing" || move === "writing" || move === "reading") return { y: [0, 2, 0, -1, 0] };
  if (move === "chart_up" || move === "matching" || move === "checking" || move === "highlighting" || move === "target") return { y: [0, -3, 0], scale: [1, 1.02, 1] };
  return { scale: [1, 1.012, 1] };
}

export default function JIA({ speaking, gesture = "welcome", auto = true, move: requestedMove }: Props) {
  const reduced = useReducedMotion();
  const blink = useBlink();
  const [move, setMove] = useState<JIA100Move>("idle");
  const [talk, setTalk] = useState(false);
  const overrideUntil = useRef(0);
  const indexRef = useRef(0);

  const contextualMove = useMemo(() => GESTURE_MOVE[gesture] ?? "idle", [gesture]);

  useEffect(() => {
    setMove(requestedMove ?? contextualMove);
    overrideUntil.current = Date.now() + 4200;
  }, [contextualMove, requestedMove]);

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
      const requested = (event as CustomEvent<{ move?: JIA100Move }>).detail?.move;
      if (!requested || !JIA_100_MOVES.includes(requested)) return;
      setMove(requested);
      overrideUntil.current = Date.now() + 4200;
    };
    window.addEventListener("jobly:jia-move", onMove);
    return () => window.removeEventListener("jobly:jia-move", onMove);
  }, []);

  useEffect(() => {
    if (!speaking) { setTalk(false); return; }
    const timer = window.setInterval(() => setTalk((v) => !v), 125);
    return () => window.clearInterval(timer);
  }, [speaking]);

  const animation = motionFor(move);

  return (
    <motion.div
      className="relative h-full w-full select-none overflow-visible"
      aria-label={`J’IA — ${move} — personnage animé de Jobly`}
      animate={reduced ? undefined : animation}
      transition={{ duration: move === "celebrate_jump" || move === "rocket" ? 1.1 : 0.8, ease: "easeInOut" }}
    >
      <motion.img
        src="/jia/jia-master.png"
        alt="J’IA"
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain object-center"
        animate={reduced ? undefined : (move === "idle" ? { scale: [1, 1.012, 1], y: [0, -1, 0] } : animation)}
        transition={{ duration: move === "idle" ? 3 : 0.8, repeat: move === "idle" ? Infinity : 0, ease: "easeInOut" }}
      />
      <div aria-hidden className="pointer-events-none absolute" style={{left:"43.8%",top:"25.4%",width:"4.9%",height:"2%",transform:"translate(-50%,-50%)"}}>
        <motion.span className="absolute left-[28%] top-1/2 h-[20%] w-[12%] -translate-y-1/2 rounded-full bg-[#17212B]" animate={reduced?undefined:{x:move.includes("think")?[0,2,4,2,0]:[0,1.5,0,-.8,0]}} transition={{duration:move.includes("think")?2.4:4.8,repeat:Infinity,ease:"easeInOut"}}/>
      </div>
      <div aria-hidden className="pointer-events-none absolute" style={{left:"58.7%",top:"25.5%",width:"4.9%",height:"2%",transform:"translate(-50%,-50%)"}}>
        <motion.span className="absolute left-[28%] top-1/2 h-[20%] w-[12%] -translate-y-1/2 rounded-full bg-[#17212B]" animate={reduced?undefined:{x:move.includes("think")?[0,2,4,2,0]:[0,-1.5,0,.8,0]}} transition={{duration:move.includes("think")?2.4:5.2,repeat:Infinity,ease:"easeInOut"}}/>
      </div>
      <motion.div aria-hidden className="pointer-events-none absolute left-[36.5%] top-[24.6%] h-[2.2%] w-[29%] rounded-full bg-[#9A5B3E]" animate={{scaleY:blink?1:.08,opacity:blink?.9:0}} transition={{duration:.07}}/>
      <motion.div aria-hidden className="pointer-events-none absolute left-[51.2%] top-[38.3%] h-[2.4%] w-[8.8%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-[#6B302B]/70 bg-[#8E3F3B]/25" animate={{scaleX:speaking?(talk?1.12:.88):.86,scaleY:speaking?(talk?1.22:.78):.55,opacity:speaking?.65:0}} transition={{duration:.09}}/>
    </motion.div>
  );
}

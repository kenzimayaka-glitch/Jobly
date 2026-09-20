"use client";

import { useEffect, useRef, useState } from "react";

type Bubble = {
  id: number;
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetVx: number;
  targetVy: number;
  popped: boolean;
  age: number;
  maxAge: number;
  color: string;
};

type Splash = {
  id: number;
  x: number;
  y: number;
  color: string;
  particles: Array<{ dx: number; dy: number; size: number }>;
};

const BUBBLE_COUNT = 14;
const JOBLY_PALETTE = [
  "#FFE135",
  "#FFE135",
  "#7EC8E3",
  "#7EC8E3",
  "#2E3F4F",
  "#A9D8EC",
  "#FFEA70",
  "#5FA9C7",
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function makeBubble(id: number): Bubble {
  return {
    id,
    size: rand(20, 60),
    x: rand(5, 95),
    y: rand(5, 95),
    vx: rand(-0.038, 0.038),
    vy: rand(-0.038, 0.038),
    targetVx: rand(-0.038, 0.038),
    targetVy: rand(-0.038, 0.038),
    popped: false,
    age: 0,
    maxAge: rand(9000, 17000),
    color: JOBLY_PALETTE[Math.floor(Math.random() * JOBLY_PALETTE.length)],
  };
}

export default function BubbleField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<Bubble[]>(Array.from({ length: BUBBLE_COUNT }, (_, i) => makeBubble(i)));
  const elRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rafRef = useRef<number | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const splashIdRef = useRef(0);
  const [splashes, setSplashes] = useState<Splash[]>([]);
  const burstRef = useRef<((b: Bubble, idx: number) => void) | null>(null);

  useEffect(() => {
    let last = performance.now();

    function burst(b: Bubble, idx: number) {
      if (b.popped) return;
      b.popped = true;
      const el = elRefs.current[idx];
      if (el) {
        el.classList.remove("bubble-respawn");
        void el.offsetWidth;
        el.classList.add("bubble-pop");
      }

      const particleCount = Math.round(rand(7, 11));
      const particles = Array.from({ length: particleCount }, () => {
        const angle = rand(0, Math.PI * 2);
        const distance = rand(18, 46);
        return {
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          size: rand(4, 9),
        };
      });
      const splashId = ++splashIdRef.current;
      setSplashes((prev) => [...prev, { id: splashId, x: b.x, y: b.y, color: b.color, particles }]);
      const splashTimer = setTimeout(() => {
        setSplashes((prev) => prev.filter((splash) => splash.id !== splashId));
      }, 760);
      timersRef.current.push(splashTimer);

      const respawnTimer = setTimeout(() => {
        const fresh = makeBubble(b.id);
        bubblesRef.current[idx] = fresh;
        const el2 = elRefs.current[idx];
        if (el2) {
          el2.style.left = `${fresh.x}%`;
          el2.style.top = `${fresh.y}%`;
          el2.style.borderColor = `${fresh.color}88`;
          el2.style.backgroundColor = `${fresh.color}20`;
          el2.style.boxShadow = `inset 0 0 14px rgba(255,255,255,.85), 0 5px 16px ${fresh.color}35`;
          el2.classList.remove("bubble-pop");
          void el2.offsetWidth;
          el2.classList.add("bubble-respawn");
          const t2 = setTimeout(() => el2.classList.remove("bubble-respawn"), 550);
          timersRef.current.push(t2);
        }
      }, 1050);
      timersRef.current.push(respawnTimer);
    }

    burstRef.current = burst;

    function step(now: number) {
      const dt = Math.min(now - last, 48);
      last = now;
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const bubbles = bubblesRef.current;

        for (const b of bubbles) {
          if (b.popped) continue;
          b.age += dt;
          if (b.age >= b.maxAge) {
            const idx = bubbles.indexOf(b);
            if (idx >= 0) burst(b, idx);
            continue;
          }
          if (Math.random() < 0.012) {
            b.targetVx = rand(-0.038, 0.038);
            b.targetVy = rand(-0.038, 0.038);
          }
          b.vx += (b.targetVx - b.vx) * 0.018;
          b.vy += (b.targetVy - b.vy) * 0.018;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.x < 3) { b.x = 3; b.vx = Math.abs(b.vx); b.targetVx = Math.abs(b.targetVx); }
          if (b.x > 97) { b.x = 97; b.vx = -Math.abs(b.vx); b.targetVx = -Math.abs(b.targetVx); }
          if (b.y < 3) { b.y = 3; b.vy = Math.abs(b.vy); b.targetVy = Math.abs(b.targetVy); }
          if (b.y > 97) { b.y = 97; b.vy = -Math.abs(b.vy); b.targetVy = -Math.abs(b.targetVy); }
        }

        for (let i = 0; i < bubbles.length; i++) {
          const a = bubbles[i];
          if (a.popped) continue;
          for (let j = i + 1; j < bubbles.length; j++) {
            const b = bubbles[j];
            if (b.popped) continue;
            const ax = (a.x / 100) * rect.width;
            const ay = (a.y / 100) * rect.height;
            const bx = (b.x / 100) * rect.width;
            const by = (b.y / 100) * rect.height;
            const dist = Math.hypot(ax - bx, ay - by);
            const minDist = (a.size + b.size) / 2 + 2;
            if (dist < minDist) {
              burst(a, i);
              burst(b, j);
            }
          }
        }

        bubbles.forEach((b, idx) => {
          if (b.popped) return;
          const el = elRefs.current[idx];
          if (!el) return;
          el.style.left = `${b.x}%`;
          el.style.top = `${b.y}%`;
        });
      }
      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      burstRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-[6] overflow-hidden" aria-hidden="true">
      {bubblesRef.current.map((b, idx) => (
        <div
          key={b.id}
          ref={(el) => { elRefs.current[idx] = el; }}
          onClick={(event) => {
            event.stopPropagation();
            const current = bubblesRef.current[idx];
            if (!current.popped) burstRef.current?.(current, idx);
          }}
          className="bubble absolute pointer-events-auto cursor-pointer rounded-full border blur-[2px] opacity-50"
          style={{
            width: b.size,
            height: b.size,
            left: `${b.x}%`,
            top: `${b.y}%`,
            transform: "translate(-50%,-50%)",
            borderColor: `${b.color}88`,
            backgroundColor: `${b.color}20`,
            boxShadow: `inset 0 0 12px rgba(255,255,255,.55), 0 4px 12px ${b.color}22`,
          }}
        />
      ))}

      {splashes.map((splash) => (
        <div key={splash.id} className="pointer-events-none absolute" style={{ left: `${splash.x}%`, top: `${splash.y}%` }}>
          <span className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[2px] opacity-45" style={{ backgroundColor: splash.color, boxShadow: `0 0 10px ${splash.color}55` }} />
          {splash.particles.map((particle, index) => (
            <span
              key={`${splash.id}-${index}`}
              className="splash-particle blur-[2px] opacity-45"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: splash.color,
                ["--dx" as string]: `${particle.dx}px`,
                ["--dy" as string]: `${particle.dy}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

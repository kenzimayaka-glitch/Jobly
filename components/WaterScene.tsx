"use client";

import { useEffect, useRef } from "react";

export default function WaterScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const W = (c.width = 1280);
    const H = (c.height = 720);
    let t = 0;
    let frame = 0;

    const bits = Array.from({ length: 22 }, () => ({
      x: 640 + (Math.random() - 0.5) * 90,
      y: 200 + Math.random() * 280,
      v: 0.15 + Math.random() * 0.5,
      char: Math.random() > 0.5 ? "0" : "1",
      col: Math.random() > 0.6 ? "#FFD60A" : "#3DE8FF",
    }));

    const draw = () => {
      t += 0.01;
      frame = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);

      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#050A20");
      g.addColorStop(1, "#02030A");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = `hsla(${200 + i * 20},100%,60%,0.15)`;
        ctx.fillRect(
          100 + i * 180 + Math.sin(t + i) * 20,
          0,
          2 + Math.sin(t) * 2,
          H
        );
      }

      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(
          640,
          540,
          120 + i * 90 + Math.sin(t * 0.8 + i) * 8,
          35 + i * 12,
          0,
          0,
          Math.PI * 2
        );
        ctx.strokeStyle =
          i === 0
            ? "rgba(255,214,10,0.9)"
            : i === 1
              ? "rgba(60,232,255,0.6)"
              : "rgba(180,60,255,0.5)";
        ctx.lineWidth = i === 0 ? 2.5 : 1.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.save();
      ctx.translate(640, 360);

      const path = new Path2D();
      path.moveTo(0, -210);
      path.bezierCurveTo(95, -60, 110, 90, 0, 145);
      path.bezierCurveTo(-110, 90, -95, -60, 0, -210);

      ctx.fillStyle = "rgba(80,200,255,0.12)";
      ctx.fill(path);

      ctx.strokeStyle = "rgba(160,235,255,0.9)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#4DE1FF";
      ctx.shadowBlur = 20;
      ctx.stroke(path);
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.moveTo(5, -180);
      ctx.bezierCurveTo(70, -50, -70, 10, -5, 130);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      const fiber = (dir: number) => {
        ctx.beginPath();
        ctx.moveTo(dir * 5, -170);
        ctx.bezierCurveTo(dir * 65, -40, dir * -55, 30, dir * -10, 120);
        ctx.strokeStyle =
          dir > 0 ? "rgba(255,214,10,0.95)" : "rgba(62,232,255,0.9)";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      };
      fiber(1);
      fiber(-1);

      for (let i = 0; i < 30; i++) {
        const a = t * 0.5 + i;
        const r = 90 + (i % 3) * 40 + Math.sin(a) * 10;
        ctx.fillStyle = `hsla(${40 + i * 5},100%,70%,0.6)`;
        ctx.beginPath();
        ctx.arc(
          Math.cos(a) * r,
          Math.sin(a * 1.3) * r * 0.8,
          1.2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      ctx.restore();

      bits.forEach((b) => {
        b.y -= b.v;
        if (b.y < 180) b.y = 420;
        ctx.font = "bold 18px monospace";
        ctx.fillStyle = b.col;
        ctx.shadowColor = b.col;
        ctx.shadowBlur = 12;
        ctx.fillText(b.char, b.x, b.y);
        ctx.shadowBlur = 0;
      });

      ctx.beginPath();
      ctx.arc(640, 152, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#FFE27A";
      ctx.shadowColor = "#FFD60A";
      ctx.shadowBlur = 30;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#020410]">
      <canvas
        ref={ref}
        className="h-full w-full object-cover"
        aria-label="Animation J'IA"
      />
    </div>
  );
}

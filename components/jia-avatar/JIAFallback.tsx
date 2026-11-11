"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { motion } from "framer-motion";

type Props = { speaking: boolean };
type State = { failed: boolean };

export class JIA3DErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("jobly:jia-3d-error", {
        detail: { message: error instanceof Error ? error.message : "3D asset unavailable", componentStack: info.componentStack },
      }));
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Fallback local, sans asset externe : J’IA reste opérationnelle même si le GLB 3D ne charge pas. */
export function JIAFallback({ speaking }: Props) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px]" aria-hidden="true">
      <svg viewBox="0 0 240 300" className="h-full w-full" role="img">
        <defs>
          <linearGradient id="jia-skin" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#9b5a35" />
            <stop offset="1" stopColor="#6f3b25" />
          </linearGradient>
          <linearGradient id="jia-blue" x1="0" x2="1">
            <stop offset="0" stopColor="#0757b8" />
            <stop offset="1" stopColor="#123b82" />
          </linearGradient>
        </defs>

        {/* Hair */}
        <path d="M57 104C48 55 74 25 120 25c46 0 75 30 67 79l-13 33H69z" fill="#241b19" />
        <circle cx="73" cy="67" r="19" fill="#302421" />
        <circle cx="166" cy="67" r="19" fill="#302421" />

        {/* Face */}
        <path d="M72 80c0-29 20-47 48-47s48 18 48 47v47c0 30-22 53-48 53s-48-23-48-53z" fill="url(#jia-skin)" />
        <path d="M91 100h18M131 100h18" stroke="#211815" strokeWidth="5" strokeLinecap="round" />
        <circle cx="103" cy="101" r="3.5" fill="#15100f" />
        <circle cx="137" cy="101" r="3.5" fill="#15100f" />
        {/* Gold glasses */}
        <circle cx="103" cy="101" r="18" fill="none" stroke="#d7a83b" strokeWidth="3" />
        <circle cx="137" cy="101" r="18" fill="none" stroke="#d7a83b" strokeWidth="3" />
        <path d="M121 101h-2" stroke="#d7a83b" strokeWidth="3" />
        {/* Mouth */}
        <motion.path
          d={speaking ? "M108 130Q120 140 132 130" : "M108 132Q120 136 132 132"}
          fill="none" stroke="#421d1b" strokeWidth="4" strokeLinecap="round"
          animate={speaking ? { d: ["M108 130Q120 140 132 130", "M108 134Q120 126 132 134"] } : undefined}
          transition={speaking ? { duration: 0.22, repeat: Infinity, repeatType: "mirror" } : undefined}
        />

        {/* Neck + amber scarf */}
        <path d="M101 166h38v35h-38z" fill="url(#jia-skin)" />
        <path d="M88 169Q120 190 152 169l16 46H72z" fill="#e1a72e" />
        {/* Blue blazer */}
        <path d="M92 186 120 205l28-19 39 30 25 84H28l25-84z" fill="url(#jia-blue)" />
        <path d="m120 205-18 95h36z" fill="#f8f8f8" opacity=".9" />
        <path d="M88 191 120 217 152 191" fill="none" stroke="#e1a72e" strokeWidth="7" />
        {/* Pin */}
        <circle cx="155" cy="239" r="10" fill="#f4c84b" />
        <text x="155" y="243" textAnchor="middle" fontSize="7" fontWeight="900" fill="#123b82">J’IA</text>
      </svg>
    </div>
  );
}

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canari: "#FFE135",
        "sky-blue": "#7EC8E3",
        "deep-blue": "#2E3F4F",
        "off-white": "#FFFEFB",
        navy: "#0A1931",
        "jobly-blue": "#2E5C9E",
        "jobly-blue-dark": "#1D4ED8",
        "jobly-green": "#00C950",
        "jobly-green-dark": "#10B981",
        "jobly-yellow": "#FFC72C",
        "jobly-yellow-canary": "#FFC72C",
        "jobly-gray": "#6B7280",
        "jobly-violet": "#8B5CF6",
        "jobly-mint": "#10B981",
        "jobly-orange": "#F97316",
        "jobly-cyan": "#06B6D4",
        "card-blue": "#EAF2FF",
        "card-purple": "#F0E9FF",
        "card-green": "#E8F5E9",
        "card-orange": "#FFF3E8",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "var(--font-plus-jakarta)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Plus Jakarta Sans", "var(--font-plus-jakarta)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["Plus Jakarta Sans", "var(--font-plus-jakarta)", "Poppins", "ui-sans-serif", "sans-serif"],
      },
      borderRadius: {
        "4xl": "28px",
        "card": "20px",
      },
      boxShadow: {
        "card": "0 8px 20px rgba(22,37,74,0.06)",
        "card-lg": "0 16px 50px rgba(22,37,74,0.10)",
        "glow-canari": "0 10px 30px rgba(255,225,53,0.45)",
        "premium": "0 16px 40px rgba(46,63,79,0.12)",
      },
      keyframes: {
        "heart-fall": {
          "0%": { transform: "translateY(-95vh)", opacity: "0" },
          "4%": { opacity: "1" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "heart-beat": {
          "0%,100%": { transform: "scale(1)" },
          "25%": { transform: "scale(1.3)" },
          "45%": { transform: "scale(1)" },
        },
        "bubble-float": {
          "0%,100%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(6px,-12px,0)" },
        },
        sparkle: {
          "0%,100%": { transform: "scale(1) rotate(0deg)", opacity: "0.9" },
          "50%": { transform: "scale(1.15) rotate(12deg)", opacity: "1" },
        },
      },
      animation: {
        "heart-fall": "heart-fall 3.7s cubic-bezier(.62,.03,.76,.2) 1 both",
        "heart-beat": "heart-beat 1.1s ease-in-out 3.7s infinite",
        "bubble-float": "bubble-float 6s ease-in-out infinite",
        sparkle: "sparkle 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;

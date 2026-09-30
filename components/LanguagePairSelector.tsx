"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../lib/supabase";

const COMMON_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
  { code: "ar", label: "العربية" },
  { code: "sw", label: "Kiswahili" },
] as const;

type Props = { initialLanguages?: string[] };

export default function LanguagePairSelector({ initialLanguages = ["fr", "en"] }: Props) {
  const [secondary, setSecondary] = useState(initialLanguages.find((code) => code !== "fr") || "en");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = initialLanguages.find((code) => code !== "fr");
    if (next && COMMON_LANGUAGES.some((item) => item.code === next)) setSecondary(next);
  }, [initialLanguages]);

  async function handleChange(value: string) {
    setSecondary(value);
    setSaving(true);
    try {
      const session = await getSupabaseClient().auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ section: "profil", preferredLanguages: ["fr", value] }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-[#DCE5F1] bg-white/90 px-2.5 py-1.5 text-[11px] font-bold text-[#22448B] shadow-[0_5px_16px_rgba(7,27,69,.06)] backdrop-blur">
      <span>Français</span>
      <span className="text-[#B8C3D2]">|</span>
      <label className="relative">
        <select
          aria-label="Choisir une deuxième langue"
          value={secondary}
          onChange={(event) => handleChange(event.target.value)}
          disabled={saving}
          className="cursor-pointer appearance-none bg-transparent pr-4 font-black outline-none"
        >
          {COMMON_LANGUAGES.filter((item) => item.code !== "fr").map((item) => (
            <option key={item.code} value={item.code}>{item.label}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[9px]">▾</span>
      </label>
    </div>
  );
}

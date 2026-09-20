"use client";

import { useEffect } from "react";

export default function LanguageSync() {
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("jobly-lang");
      const lang = saved === "en" ? "en" : "fr";
      document.documentElement.lang = lang;
      document.documentElement.setAttribute("data-lang", lang);
    } catch {}
  }, []);
  return null;
}

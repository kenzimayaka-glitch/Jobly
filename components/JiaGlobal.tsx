"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import JiaPresence from "./JiaPresence";

// Montage global unique de J’IA. Le portail place réellement la présence sous <body>,
// hors des stacking contexts des pages, layouts et navigations.
export default function JiaGlobal() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<JiaPresence />, document.body);
}

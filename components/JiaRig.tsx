"use client";

import JIA from "./JIA/JIA";
import type { JiaGesture } from "./WaterScene";
import { useOutfit } from "@/lib/jia/outfit";

type Props = { speaking: boolean; gesture: JiaGesture };

export function JiaRig({ speaking, gesture }: Props) {
  // Même tenue horaire que la présence globale (/jia/outfits — lib/jia/outfit.ts).
  const outfit = useOutfit();
  return <JIA speaking={speaking} gesture={gesture} auto outfit={outfit} />;
}

export function JiaCharacter({ speaking, gesture }: Props) {
  return <JiaRig speaking={speaking} gesture={gesture} />;
}

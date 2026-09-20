"use client";

import JIA from "./JIA/JIA";
import type { JiaGesture } from "./WaterScene";

type Props = { speaking: boolean; gesture: JiaGesture };

export function JiaRig({ speaking, gesture }: Props) {
  return <JIA speaking={speaking} gesture={gesture} auto />;
}

export function JiaCharacter({ speaking, gesture }: Props) {
  return <JiaRig speaking={speaking} gesture={gesture} />;
}

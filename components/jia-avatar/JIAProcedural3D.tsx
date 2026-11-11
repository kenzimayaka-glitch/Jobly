"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";

type Props = { speaking: boolean; move?: string };
type Rect = { left: number; top: number; width: number; height: number };
type Point = { x: number; y: number };

// Same 1408×1472 composition and pivots as the official J’IA layered rig.
// The fallback is now a depth-separated 2.5D character, not a generic sphere mannequin.
const CANVAS_WIDTH = 1.55;
const CANVAS_HEIGHT = 1.62;
const point = (x: number, y: number): Point => ({
  x: ((x / 100) - 0.5) * CANVAS_WIDTH,
  y: (0.5 - (y / 100)) * CANVAS_HEIGHT,
});
const center = (rect: Rect): Point => point(rect.left + rect.width / 2, rect.top + rect.height / 2);
const PIVOT = {
  torso: { x: 50.1, y: 100 },
  scarf: { x: 49.7, y: 44.2 },
  head: { x: 50.1, y: 46.9 },
  arm_L: { x: 32.0, y: 52.7 },
  arm_R: { x: 68.2, y: 52.9 },
  hand_L: { x: 19.2, y: 82.2 },
  hand_R: { x: 80.7, y: 82.2 },
} as const;
const RECT: Record<string, Rect> = {
  torso: { left: 25.213, top: 43.75, width: 49.787, height: 56.25 },
  scarf: { left: 29.403, top: 43.75, width: 40.696, height: 56.25 },
  arm_L: { left: 7.528, top: 49.932, width: 28.48, height: 50.068 },
  arm_R: { left: 64.915, top: 43.75, width: 27.202, height: 56.25 },
  hand_L: { left: 7.528, top: 81.114, width: 23.509, height: 18.886 },
  hand_R: { left: 69.176, top: 81.114, width: 22.94, height: 18.886 },
  head: { left: 27.983, top: 9.783, width: 44.247, height: 39.606 },
  hair: { left: 18.821, top: 0, width: 61.222, height: 47.351 },
  glasses: { left: 34.375, top: 19.973, width: 31.108, height: 13.451 },
  eyebrows: { left: 37.571, top: 18.954, width: 25.071, height: 4.28 },
  eye_L: { left: 37.571, top: 23.03, width: 10.866, height: 4.959 },
  eye_R: { left: 51.776, top: 23.03, width: 10.866, height: 4.959 },
  mouth: { left: 43.608, top: 31.861, width: 15.128, height: 6.997 },
};

function SpritePlane({
  name, pivot, z,
}: {
  name: string;
  pivot: { x: number; y: number };
  z: number;
}) {
  const texture = useTexture(`/jia/outfits/blue/${name}.webp`);
  texture.colorSpace = THREE.SRGBColorSpace;
  const rect = RECT[name];
  const c = center(rect);
  const p = point(pivot.x, pivot.y);
  const position: [number, number, number] = [c.x - p.x, c.y - p.y, z];
  const size: [number, number] = [
    (rect.width / 100) * CANVAS_WIDTH,
    (rect.height / 100) * CANVAS_HEIGHT,
  ];

  return (
    <mesh position={position} renderOrder={Math.round(z * 1000)}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.015} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function PivotGroup({ pivot, parent, children, rotation, scale }: {
  pivot: { x: number; y: number };
  parent?: { x: number; y: number };
  children: ReactNode;
  rotation?: [number, number, number];
  scale?: [number, number, number];
}) {
  const p = point(pivot.x, pivot.y);
  const base = parent ? point(parent.x, parent.y) : { x: 0, y: 0 };
  return (
    <group position={[p.x - base.x, p.y - base.y, 0]} rotation={rotation} scale={scale}>
      {children}
    </group>
  );
}

export default function JIAProcedural3D({ speaking }: Props) {
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftHand = useRef<THREE.Group>(null);
  const rightHand = useRef<THREE.Group>(null);
  const eyeLeft = useRef<THREE.Group>(null);
  const eyeRight = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Group>(null);
  const brow = useRef<THREE.Group>(null);
  const move = useRef("idle");
  const gaze = useRef({ x: 0, y: 0 });
  const blink = useRef({ next: 2.1, until: 0 });

  useEffect(() => {
    const onMove = (event: Event) => {
      move.current = (event as CustomEvent<{ move?: string }>).detail?.move || "idle";
    };
    const onPointer = (event: PointerEvent) => {
      gaze.current.x = THREE.MathUtils.clamp((event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 0.35, -0.12, 0.12);
      gaze.current.y = THREE.MathUtils.clamp((0.5 - event.clientY / Math.max(window.innerHeight, 1)) * 0.25, -0.08, 0.08);
    };
    const onGaze = (event: Event) => {
      const d = (event as CustomEvent<{ x?: number; y?: number }>).detail ?? {};
      gaze.current.x = THREE.MathUtils.clamp(Number(d.x) || 0, -0.12, 0.12);
      gaze.current.y = THREE.MathUtils.clamp(Number(d.y) || 0, -0.08, 0.08);
    };
    window.addEventListener("jobly:jia-move", onMove);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("jobly:jia-gaze", onGaze);
    return () => {
      window.removeEventListener("jobly:jia-move", onMove);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("jobly:jia-gaze", onGaze);
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const current = move.current;
    const pointing = current.startsWith("point_") || current === "point_button" || current === "point_you";
    const explaining = current === "explain_open" || current === "explain_wide" || current === "celebrate_jump";

    if (root.current) {
      const breath = Math.sin(t * (speaking ? 2.2 : 1.1));
      root.current.position.y = -0.06 + breath * (speaking ? 0.006 : 0.003);
    }
    if (head.current) {
      const lookX = gaze.current.x;
      const lookY = gaze.current.y;
      const tilt = current === "listen_tilt" ? -0.11 : current.startsWith("think_") ? -0.055 : 0;
      const nod = current === "nod_slow" ? Math.sin(t * 3) * 0.07 : 0;
      head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, lookX + Math.sin(t * 0.42) * 0.012, 4, delta);
      head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, lookY + nod, 5, delta);
      head.current.rotation.z = THREE.MathUtils.damp(head.current.rotation.z, tilt + Math.sin(t * 0.6) * 0.01, 5, delta);
    }

    const leftTarget = current === "explain_open" || current === "explain_wide" || current === "celebrate_jump" ? 0.36 : current === "hand_chest" || current === "scarf_touch" ? 0.28 : current === "point_left" ? -0.42 : -0.07;
    const rightTarget = pointing || current === "wave_hi" || current === "wave_bye" ? -0.48 : explaining ? -0.36 : -0.07;
    if (leftArm.current) leftArm.current.rotation.z = THREE.MathUtils.damp(leftArm.current.rotation.z, leftTarget, 6, delta);
    if (rightArm.current) rightArm.current.rotation.z = THREE.MathUtils.damp(rightArm.current.rotation.z, rightTarget, 6, delta);
    if (leftHand.current) leftHand.current.rotation.z = THREE.MathUtils.damp(leftHand.current.rotation.z, current === "point_left" ? -0.22 : 0, 7, delta);
    if (rightHand.current) {
      const wave = current === "wave_hi" || current === "wave_bye" ? Math.sin(t * 7) * 0.16 : 0;
      rightHand.current.rotation.z = THREE.MathUtils.damp(rightHand.current.rotation.z, wave + (pointing ? -0.16 : 0), 7, delta);
    }

    if (t >= blink.current.next) {
      blink.current.until = t + 0.13;
      blink.current.next = t + 2.8 + Math.random() * 2.8;
    }
    const blinkY = t < blink.current.until ? 0.08 : 1;
    [eyeLeft.current, eyeRight.current].forEach((eye) => {
      if (!eye) return;
      eye.scale.y = THREE.MathUtils.damp(eye.scale.y, blinkY, 24, delta);
      eye.position.x = THREE.MathUtils.damp(eye.position.x, gaze.current.x * 0.12, 8, delta);
      eye.position.y = THREE.MathUtils.damp(eye.position.y, gaze.current.y * 0.12, 8, delta);
    });
    if (mouth.current) {
      const target = speaking ? 1 + (Math.sin(t * 18) + 1) * 0.22 : 0.8;
      mouth.current.scale.y = THREE.MathUtils.damp(mouth.current.scale.y, target, 15, delta);
    }
    if (brow.current) {
      const target = /surpris|idea|curious|think/.test(current) ? 1.12 : 1;
      brow.current.scale.y = THREE.MathUtils.damp(brow.current.scale.y, target, 8, delta);
    }
  });

  const leftEyeCenter = {
    x: RECT.eye_L.left + RECT.eye_L.width / 2,
    y: RECT.eye_L.top + RECT.eye_L.height / 2,
  };
  const rightEyeCenter = {
    x: RECT.eye_R.left + RECT.eye_R.width / 2,
    y: RECT.eye_R.top + RECT.eye_R.height / 2,
  };
  const mouthCenter = {
    x: RECT.mouth.left + RECT.mouth.width / 2,
    y: RECT.mouth.top + RECT.mouth.height / 2,
  };
  const browCenter = {
    x: RECT.eyebrows.left + RECT.eyebrows.width / 2,
    y: RECT.eyebrows.top + RECT.eyebrows.height / 2,
  };

  return (
    <group ref={root} scale={0.82}>
      <PivotGroup pivot={PIVOT.torso}>
        <SpritePlane name="torso" pivot={PIVOT.torso} z={0.02} />
        <PivotGroup pivot={PIVOT.scarf} parent={PIVOT.torso}>
          <SpritePlane name="scarf" pivot={PIVOT.scarf} z={0.08} />
        </PivotGroup>
        <PivotGroup pivot={PIVOT.arm_L} parent={PIVOT.torso}>
          <group ref={leftArm}>
            <SpritePlane name="arm_L" pivot={PIVOT.arm_L} z={0.09} />
            <PivotGroup pivot={PIVOT.hand_L} parent={PIVOT.arm_L}>
              <group ref={leftHand}>
                <SpritePlane name="hand_L" pivot={PIVOT.hand_L} z={0.13} />
              </group>
            </PivotGroup>
          </group>
        </PivotGroup>
        <PivotGroup pivot={PIVOT.arm_R} parent={PIVOT.torso}>
          <group ref={rightArm}>
            <SpritePlane name="arm_R" pivot={PIVOT.arm_R} z={0.10} />
            <PivotGroup pivot={PIVOT.hand_R} parent={PIVOT.arm_R}>
              <group ref={rightHand}>
                <SpritePlane name="hand_R" pivot={PIVOT.hand_R} z={0.14} />
              </group>
            </PivotGroup>
          </group>
        </PivotGroup>
      </PivotGroup>
      <PivotGroup pivot={PIVOT.head}>
        <group ref={head}>
          <SpritePlane name="head" pivot={PIVOT.head} z={0.16} />
          <SpritePlane name="hair" pivot={PIVOT.head} z={0.18} />
          <PivotGroup pivot={browCenter} parent={PIVOT.head}>
            <group ref={brow}>
              <SpritePlane name="eyebrows" pivot={browCenter} z={0.22} />
            </group>
          </PivotGroup>
          <PivotGroup pivot={leftEyeCenter} parent={PIVOT.head}>
            <group ref={eyeLeft}>
              <SpritePlane name="eye_L" pivot={leftEyeCenter} z={0.23} />
            </group>
          </PivotGroup>
          <PivotGroup pivot={rightEyeCenter} parent={PIVOT.head}>
            <group ref={eyeRight}>
              <SpritePlane name="eye_R" pivot={rightEyeCenter} z={0.23} />
            </group>
          </PivotGroup>
          <PivotGroup pivot={mouthCenter} parent={PIVOT.head}>
            <group ref={mouth}>
              <SpritePlane name="mouth" pivot={mouthCenter} z={0.24} />
            </group>
          </PivotGroup>
          <SpritePlane name="glasses" pivot={PIVOT.head} z={0.26} />
        </group>
      </PivotGroup>
    </group>
  );
}

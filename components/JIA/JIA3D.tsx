"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useAnimations, useGLTF } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JIA3DErrorBoundary } from "./JIAFallback";
import JIAProcedural3D from "./JIAProcedural3D";
import * as THREE from "three";
import { motion } from "framer-motion";
import { clipConfig, pickClipKey, pickClipSources, preloadClips } from "./clips";
import { useOutfit } from "@/lib/jia/outfit";
import { JIA_AVATAR_APPEARANCES, type JiaAvatarAppearanceVariation } from "@/lib/jia/visual-variations";
import type { JIA100Move } from "./movements";
// gltf runtime: the official J’IA model is loaded through drei/useGLTF.
type Move = JIA100Move;

const MOVE_CLIP_HINTS: Record<string, string[]> = {
  wave_hi: ["wave", "hello", "greet"],
  wave_bye: ["wave", "bye"],
  nod_slow: ["nod", "yes"],
  shake_no: ["shake", "no"],
  celebrate_jump: ["celebrate", "jump", "victory"],
  hand_shake: ["handshake", "shake"],
  point_button: ["point", "pointing"],
  point_you: ["point", "pointing"],
  think_chin: ["think", "thinking"],
  reading: ["read", "reading"],
  writing: ["write", "writing"],
  explain_open: ["explain", "talk", "gesture"],
};

type SideRig = {
  upperArm: THREE.Bone | null;
  forearm: THREE.Bone | null;
  hand: THREE.Bone | null;
  fingers: Record<"thumb" | "index" | "middle" | "ring" | "little", THREE.Bone[]>;
};

type ModelRig = {
  head: THREE.Bone | null;
  spine: THREE.Bone | null;
  left: SideRig;
  right: SideRig;
  eyes: THREE.Bone[];
  all: THREE.Bone[];
  eyeMeshes: THREE.Mesh[];
  morphs: Array<{ mesh: THREE.Mesh; index: number; name: string }>;
};

function boneKey(value: string) {
  return value.toLowerCase().replace(/mixamorig|armature|skeleton|rig/g, "").replace(/[^a-z0-9]/g, "");
}

function belongsToSide(name: string, side: "left" | "right") {
  const key = boneKey(name);
  if (key.includes(side)) return true;
  return side === "left"
    ? /^l(clavicle|shoulder|upperarm|arm|forearm|lowerarm|hand|thumb|index|middle|ring|pinky|little)/.test(key)
    : /^r(clavicle|shoulder|upperarm|arm|forearm|lowerarm|hand|thumb|index|middle|ring|pinky|little)/.test(key);
}

function collectModelRig(root: THREE.Object3D): ModelRig {
  const bones: THREE.Bone[] = [];
  const eyeMeshes: THREE.Mesh[] = [];
  const morphs: ModelRig["morphs"] = [];

  root.traverse((node) => {
    const candidate = node as THREE.Bone;
    if (candidate.isBone) bones.push(candidate);
    const mesh = node as THREE.Mesh;
    const key = boneKey(node.name);
    if (mesh.isMesh && /eye|eyeball|iris|pupil/.test(key)) eyeMeshes.push(mesh);
    if (mesh.isMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
      Object.entries(mesh.morphTargetDictionary).forEach(([name, index]) => {
        morphs.push({ mesh, index, name: name.toLowerCase() });
      });
    }
  });

  const sideRig = (side: "left" | "right"): SideRig => {
    const own = bones.filter((bone) => belongsToSide(bone.name, side));
    const find = (pattern: RegExp) => own.find((bone) => pattern.test(boneKey(bone.name))) ?? null;
    const fingers = {
      thumb: own.filter((bone) => /thumb/.test(boneKey(bone.name))),
      index: own.filter((bone) => /index|pointfinger/.test(boneKey(bone.name))),
      middle: own.filter((bone) => /middle|midfinger/.test(boneKey(bone.name))),
      ring: own.filter((bone) => /ringfinger/.test(boneKey(bone.name))),
      little: own.filter((bone) => /pinky|pinkie|littlefinger/.test(boneKey(bone.name))),
    };
    Object.values(fingers).forEach((chain) => chain.sort((a, b) => {
      const depth = (name: string) => Number(boneKey(name).match(/(?:[0-9]+)$/)?.[0] ?? 0);
      return depth(a.name) - depth(b.name);
    }));
    return {
      upperArm: find(/upperarm|shoulderarm|arm$/),
      forearm: find(/forearm|lowerarm/),
      hand: find(/hand(?!.*(?:thumb|index|middle|ring|pinky|little))/),
      fingers,
    };
  };

  const head = bones.find((bone) => /head$/.test(boneKey(bone.name))) ?? bones.find((bone) => /head/.test(boneKey(bone.name))) ?? null;
  const spine = bones.find((bone) => /upperchest|chest|spine2|spine$/.test(boneKey(bone.name))) ?? null;
  const eyes = bones.filter((bone) => /eye(?!lid)/.test(boneKey(bone.name)));
  const left = sideRig("left");
  const right = sideRig("right");
  const all = Array.from(new Set([
    head, spine, ...eyes,
    left.upperArm, left.forearm, left.hand, ...Object.values(left.fingers).flat(),
    right.upperArm, right.forearm, right.hand, ...Object.values(right.fingers).flat(),
  ].filter((bone): bone is THREE.Bone => Boolean(bone))));

  return { head, spine, left, right, eyes, all, eyeMeshes, morphs };
}

function radians(degrees: number) {
  return THREE.MathUtils.degToRad(degrees);
}

function JIAAppearanceOverlay({ appearance }: { appearance: JiaAvatarAppearanceVariation }) {
  const pin = (() => {
    switch (appearance.pinShape) {
      case "sun": return <><circle cx="0" cy="0" r="12"/><path d="M0 -19V-15 M0 15V19 M-19 0H-15 M15 0H19 M-13 -13L-10 -10 M10 10L13 13 M13 -13L10 -10 M-10 10L-13 13"/></>;
      case "leaf": return <><path d="M-16 10C-19 -8 -5 -19 16 -16C17 3 5 18 -16 10Z"/><path d="M-12 12L12 -12"/></>;
      case "flower": return <><circle cx="0" cy="-11" r="7"/><circle cx="11" cy="0" r="7"/><circle cx="0" cy="11" r="7"/><circle cx="-11" cy="0" r="7"/><circle cx="0" cy="0" r="5"/></>;
      case "star": return <path d="M0 -19L5 -6L19 -5L8 4L12 18L0 10L-12 18L-8 4L-19 -5L-5 -6Z"/>;
      default: return <path d="M0 -19L16 0L0 19L-16 0Z M0 -19V19 M-16 0H16"/>;
    }
  })();
  const lapel = (() => {
    switch (appearance.lapel) {
      case "double": return <><path d="M525 625C580 700 625 780 670 865"/><path d="M883 625C828 700 783 780 738 865"/></>;
      case "angled": return <><path d="M520 635L650 790L674 872"/><path d="M888 635L758 790L734 872"/></>;
      case "curved": return <><path d="M520 620C610 675 630 800 676 865"/><path d="M888 620C798 675 778 800 732 865"/></>;
      case "stitched": return <><path d="M520 620C610 690 640 800 676 865" strokeDasharray="10 9"/><path d="M888 620C798 690 768 800 732 865" strokeDasharray="10 9"/></>;
      default: return <><path d="M535 620C600 700 635 785 680 865"/><path d="M873 620C808 700 773 785 728 865"/></>;
    }
  })();
  const scarfPattern = (() => {
    switch (appearance.scarfDetail) {
      case "dot": return Array.from({length: 7}, (_, i) => <circle key={i} cx={590 + i * 37} cy={574 + (i % 2) * 11} r="5"/>);
      case "woven": return <path d="M590 570L620 595L650 570L680 595L710 570L740 595L770 570L800 595L830 570" strokeDasharray="8 5"/>;
      case "diagonal": return Array.from({length: 6}, (_, i) => <path key={i} d={"M" + (600+i*33) + " 566L" + (620+i*33) + " 600"}/>);
      case "petal": return Array.from({length: 5}, (_, i) => <ellipse key={i} cx={620+i*42} cy={582+(i%2)*6} rx="7" ry="12" transform={"rotate(35 " + (620+i*42) + " " + (582+(i%2)*6) + ")"}/>);
      default: return <path d="M585 563C660 603 748 603 822 563"/>;
    }
  })();
  return (
    <svg
      viewBox="0 0 1408 1472"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      data-jia-avatar-appearance={appearance.id}
    >
      <g fill="none" stroke={appearance.blazerAccent} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity=".96">
        {lapel}
      </g>
      <g fill="none" stroke={appearance.scarfAccent} strokeWidth="6" strokeLinecap="round" opacity=".92">
        {scarfPattern}
      </g>
      <g transform={"translate(822 785) scale(" + appearance.pinScale + ")"} fill={appearance.pin} stroke={appearance.embroidery} strokeWidth="2.5" strokeLinejoin="round">
        {pin}
      </g>
      <g fill="none" stroke={appearance.embroidery} strokeWidth="3" opacity=".9" strokeLinecap="round">
        {Array.from({length: appearance.stitchDensity}, (_, index) => (
          <path key={index} d={"M" + (520+index*13) + " " + (940+appearance.motifOffset) + "l8 10"}/>
        ))}
        <path d="M510 1040C565 1050 600 1040 640 1016" strokeDasharray="6 10"/>
      </g>
    </svg>
  );
}

const MOVE_TO_CLIP: Partial<Record<JIA100Move, string>> = {
  wave_hi: "wave_hi",
  wave_bye: "wave_bye",
  explain_open: "explain_open",
  explain_wide: "explain_wide",
  point_button: "point_you",
  point_you: "point_you",
  point_self: "hand_chest",
  hand_chest: "hand_chest",
  scarf_touch: "scarf_touch",
  think_chin: "think_chin",
  think_doubt: "think_doubt",
  smile_soft: "smile_soft",
  smile_wide: "smile_wide",
  smile_shy: "smile_shy",
  celebrate_jump: "celebrate_jump",
};

function Model({ speaking }: { speaking: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/jia/jia-officielle.glb");
  const { actions } = useAnimations(animations, group);
  const activeMove = useRef<Move>("idle");
  const activeAction = useRef<THREE.AnimationAction | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const blinkClock = useRef({ next: 2, until: 0 });
  const rig = useMemo(() => collectModelRig(scene), [scene]);
  const baseRotations = useMemo(
    () => new Map(rig.all.map((bone) => [bone, bone.rotation.clone()])),
    [rig],
  );
  const baseEyePositions = useMemo(
    () => new Map(rig.eyeMeshes.map((mesh) => [mesh, mesh.position.clone()])),
    [rig],
  );

  useEffect(() => {
    const onMove = (event: Event) => {
      const next = (event as CustomEvent<{ move?: Move }>).detail?.move;
      if (!next) return;
      activeMove.current = next;
      const hints = MOVE_CLIP_HINTS[next] ?? [];
      const clip = animations.find((item) => hints.some((hint) => item.name.toLowerCase().includes(hint)));
      if (!clip) return;
      Object.values(actions).forEach((action) => action?.stop());
      const action = actions[clip.name];
      activeAction.current = action ?? null;
      action?.reset().fadeIn(0.15).play();
      if (action) action.setLoop(THREE.LoopOnce, 1);
      if (action) action.clampWhenFinished = true;
    };

    const onPointer = (event: PointerEvent) => {
      pointer.current.x = THREE.MathUtils.clamp((event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 0.7, -0.35, 0.35);
      pointer.current.y = THREE.MathUtils.clamp((0.5 - event.clientY / Math.max(window.innerHeight, 1)) * 0.45, -0.22, 0.22);
    };
    const onGaze = (event: Event) => {
      const detail = (event as CustomEvent<{ x?: number; y?: number }>).detail ?? {};
      pointer.current.x = THREE.MathUtils.clamp(Number(detail.x) || 0, -0.35, 0.35);
      pointer.current.y = THREE.MathUtils.clamp(Number(detail.y) || 0, -0.22, 0.22);
    };

    window.addEventListener("jobly:jia-move", onMove);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("jobly:jia-gaze", onGaze);
    return () => {
      window.removeEventListener("jobly:jia-move", onMove);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("jobly:jia-gaze", onGaze);
    };
  }, [actions, animations]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    const move = activeMove.current;
    group.current.position.y = -1.32 + Math.sin(t * (speaking ? 2.2 : 1.1)) * (speaking ? 0.010 : 0.004);

    // Each controlled bone returns to its authored rest pose when a gesture ends.
    const targets = new Map<THREE.Bone, { x: number; y: number; z: number }>();
    const pose = (bone: THREE.Bone | null, x = 0, y = 0, z = 0) => {
      if (bone) targets.set(bone, { x: radians(x), y: radians(y), z: radians(z) });
    };
    const pointing = move.startsWith("point_") || move === "point_button" || move === "point_you";
    const wave = move === "wave_hi" || move === "wave_bye";
    const explain = move === "explain_open" || move === "explain_wide" || move === "celebrate_jump";

    if (move === "nod_slow" || move === "nod_fast") pose(rig.head, 7 * Math.sin(t * (move === "nod_fast" ? 7 : 3)), 0, 0);
    if (move === "shake_no" || move === "shake_soft") pose(rig.head, 0, 10 * Math.sin(t * 4), 0);
    if (move === "think_chin" || move === "think_doubt") pose(rig.head, -5, 0, -5);
    if (move === "listen_tilt" || move === "listen_forward") pose(rig.head, 2, 0, -7);
    if (move === "point_left") {
      pose(rig.left.upperArm, -28, 0, 20);
      pose(rig.left.forearm, -32, 0, 5);
    } else if (move === "point_right" || pointing) {
      pose(rig.right.upperArm, move === "point_up" ? -68 : move === "point_down" ? -12 : -28, 0, move === "point_up" ? -8 : -20);
      pose(rig.right.forearm, move === "point_down" ? 48 : -28, 0, -4);
      pose(rig.right.hand, 0, 0, -8);
    } else if (wave) {
      pose(rig.right.upperArm, -18, 0, -35);
      pose(rig.right.forearm, -48, 0, 0);
      pose(rig.right.hand, 0, 0, 12 * Math.sin(t * 7));
    } else if (explain) {
      pose(rig.left.upperArm, -18, 0, 18);
      pose(rig.right.upperArm, -18, 0, -18);
      pose(rig.left.forearm, -20, 0, 8);
      pose(rig.right.forearm, -20, 0, -8);
    } else if (move === "hand_chest" || move === "scarf_touch") {
      pose(rig.left.upperArm, -18, 0, 25);
      pose(rig.left.forearm, -62, 0, 4);
    } else if (move === "think_count" || move === "think_idea") {
      pose(rig.right.upperArm, -38, 0, -18);
      pose(rig.right.forearm, -48, 0, -5);
    }

    // A real finger rig is used when the GLB exposes one. Index extends; the other digits curl.
    if (pointing || move === "think_idea") {
      const hand = move === "point_left" ? rig.left : rig.right;
      const indexDelta = move === "think_idea" ? -0.08 : -0.42;
      hand.fingers.index.forEach((bone, index) => pose(bone, 0, 0, indexDelta / (index + 1)));
      (["middle", "ring", "little"] as const).forEach((finger) => {
        hand.fingers[finger].forEach((bone, index) => pose(bone, 0, 0, 0.32 / (index + 1)));
      });
      hand.fingers.thumb.forEach((bone, index) => pose(bone, 0, 0, -0.12 / (index + 1)));
    }

    const clipPlaying = Boolean(activeAction.current?.isRunning());
    if (activeAction.current && !clipPlaying) activeAction.current = null;

    for (const bone of rig.all) {
      if (clipPlaying) break;
      const base = baseRotations.get(bone);
      if (!base) continue;
      const target = targets.get(bone) ?? { x: 0, y: 0, z: 0 };
      bone.rotation.x = THREE.MathUtils.damp(bone.rotation.x, base.x + target.x, 8, delta);
      bone.rotation.y = THREE.MathUtils.damp(bone.rotation.y, base.y + target.y, 8, delta);
      bone.rotation.z = THREE.MathUtils.damp(bone.rotation.z, base.z + target.z, 8, delta);
    }

    // Eyes follow the pointer or a semantic gaze event; fall back to eye meshes if there are no eye bones.
    const gaze = pointer.current;
    rig.eyes.forEach((eye) => {
      const base = baseRotations.get(eye);
      if (!base) return;
      eye.rotation.y = THREE.MathUtils.damp(eye.rotation.y, base.y + gaze.x * 0.48, 6, delta);
      eye.rotation.x = THREE.MathUtils.damp(eye.rotation.x, base.x + gaze.y * 0.38, 6, delta);
    });
    rig.eyeMeshes.forEach((eye) => {
      const base = baseEyePositions.get(eye);
      if (!base || rig.eyes.length) return;
      eye.position.x = THREE.MathUtils.damp(eye.position.x, base.x + gaze.x * 0.012, 6, delta);
      eye.position.y = THREE.MathUtils.damp(eye.position.y, base.y + gaze.y * 0.010, 6, delta);
    });

    // Automatic blink + blend-shape support when the model includes facial morph targets.
    if (t >= blinkClock.current.next) {
      blinkClock.current.until = t + 0.13;
      blinkClock.current.next = t + 2.8 + Math.random() * 2.8;
    }
    const blinkValue = t < blinkClock.current.until ? Math.max(0, 1 - (blinkClock.current.until - t) / 0.13) : 0;
    const mouthValue = speaking ? 0.22 + (Math.sin(t * 18) + 1) * 0.16 : 0;
    const smileValue = /smile|greet|wave|celebrate|ok|proud/.test(move) ? 0.55 : 0;
    const browValue = /surpris|idea|curious|think/.test(move) ? 0.35 : 0;
    rig.morphs.forEach(({ mesh, index, name }) => {
      let value = 0;
      if (/blink|eyeclose|eyelidclose/.test(name)) value = blinkValue;
      else if (/jawopen|mouthopen|viseme_aa|viseme_oh|talk/.test(name)) value = mouthValue;
      else if (/smile|mouthsmile/.test(name)) value = smileValue;
      else if (/brow.*up|browinnerup/.test(name)) value = browValue;
      const influences = mesh.morphTargetInfluences;
      if (influences) influences[index] = THREE.MathUtils.damp(influences[index] ?? 0, value, 13, delta);
    });

    if (rig.spine && !clipPlaying) {
      const base = baseRotations.get(rig.spine);
      if (base) {
        const breathing = Math.sin(t * (speaking ? 2.2 : 1.1)) * (speaking ? 0.012 : 0.006);
        rig.spine.rotation.x = THREE.MathUtils.damp(rig.spine.rotation.x, base.x + breathing, 5, delta);
      }
    }
  });

  return (
    <primitive
      ref={group}
      object={scene}
      scale={1.18}
      position={[0, -1.32, 0]}
      rotation={[0, Math.PI, 0]}
    />
  );
}

export default function JIA3D({ speaking, appearanceId = "jia-appearance-01" }: { speaking: boolean; appearanceId?: string }) {
  const appearance = JIA_AVATAR_APPEARANCES.find((item) => item.id === appearanceId) || JIA_AVATAR_APPEARANCES[0];
  const outfit = useOutfit();
  const [clip, setClip] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const clipCfg = clip ? clipConfig(clip, outfit) : undefined;

  useEffect(() => {
    preloadClips(outfit);
    const onMove = (event: Event) => {
      const next = (event as CustomEvent<{ move?: JIA100Move }>).detail?.move;
      if (!next) return;
      const preferred = MOVE_TO_CLIP[next] ?? next;
      const key = pickClipKey(preferred, outfit);
      // Only use a clip when it represents this gesture; otherwise the live 3D rig
      // performs the directional pose instead of showing a misleading generic point.
      setClip(key && clipConfig(key, outfit) ? key : null);
    };
    window.addEventListener("jobly:jia-move", onMove);
    return () => window.removeEventListener("jobly:jia-move", onMove);
  }, [outfit]);

  const endClip = useCallback(() => {
    setClip(null);
    window.dispatchEvent(new CustomEvent("jobly:jia-move", { detail: { move: "idle" } }));
  }, []);

  useEffect(() => {
    if (!clipCfg) return;
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(endClip);
  }, [clipCfg?.webm, endClip]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px]" aria-hidden="true">
      <div className="absolute inset-0" style={{ opacity: clipCfg ? 0 : 1 }}>
        <JIA3DErrorBoundary
          fallback={
            <Canvas camera={{ position: [0, 0.05, 2.35], fov: 32 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
              <ambientLight intensity={1.7} />
              <directionalLight position={[2, 3, 4]} intensity={2.2} color="#fff6df" />
              <Suspense fallback={null}>
                <JIAProcedural3D speaking={speaking} />
              </Suspense>
            </Canvas>
          }
        >
          <Canvas
            camera={{ position: [0, 0.05, 2.35], fov: 32 }}
            dpr={[1, 1.5]}
            gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
          >
            <ambientLight intensity={1.5} />
            <directionalLight position={[2, 3, 4]} intensity={2.1} color="#fff6df" />
            <directionalLight position={[-2, 1, 2]} intensity={0.7} color="#8fc9ff" />
            <Suspense fallback={null}>
              <Model speaking={speaking} />
              <Environment preset="studio" />
            </Suspense>
          </Canvas>
        </JIA3DErrorBoundary>
      </div>
      {clipCfg && (
        <motion.video
          key={clip}
          ref={videoRef}
          className="absolute pointer-events-none"
          style={{
            left: `${clipCfg.fit.left}%`,
            top: `${clipCfg.fit.top}%`,
            width: `${clipCfg.fit.width}%`,
            aspectRatio: "1 / 1",
            transformOrigin: `50% ${clipCfg.fit.originY}%`,
            WebkitMaskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)",
          }}
          initial={{ opacity: 0, scale: clipCfg.fit.scaleFrom }}
          animate={{ opacity: 1, scale: [clipCfg.fit.scaleFrom, clipCfg.fit.scaleTo] }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 0.18 },
            scale: { duration: clipCfg.duration, ease: "linear" },
          }}
          muted
          playsInline
          autoPlay
          preload="auto"
          aria-hidden="true"
          onEnded={endClip}
          onError={endClip}
        >
          {pickClipSources(clipCfg).map((source) => (
            <source key={source.src} src={source.src} type={source.type} />
          ))}
        </motion.video>
      )}
      {!clipCfg && <JIAAppearanceOverlay appearance={appearance} />}
    </div>
  );
}

useGLTF.preload("/jia/jia-officielle.glb");

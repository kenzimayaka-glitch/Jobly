"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useAnimations, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { JIA3DErrorBoundary } from "./JIAFallback";
import JIAProcedural3D from "./JIAProcedural3D";
import * as THREE from "three";
import { JIA_AVATAR_APPEARANCES, type JiaAvatarAppearanceVariation } from "@/lib/jia/visual-variations";
// GLTF runtime: the official J’IA gltf model is loaded through drei/useGLTF.

type Move =
  | "idle" | "breathe_deep" | "blink_slow" | "smile_soft" | "wave_hi" | "wave_bye"
  | "nod_slow" | "listen_tilt" | "shake_no" | "think_chin" | "point_button" | "point_you"
  | "explain_open" | "scarf_touch" | "ok" | "stop" | "hand_chest" | "celebrate_jump"
  | "reading" | "matching" | "searching" | "hand_shake" | "money" | "writing";

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

function findBone(root: THREE.Object3D, hints: string[]) {
  const wanted = hints.map((x) => x.toLowerCase());
  let found: THREE.Bone | null = null;
  root.traverse((node) => {
    if (found || !(node as THREE.Bone).isBone) return;
    const name = node.name.toLowerCase();
    if (wanted.some((hint) => name.includes(hint))) found = node as THREE.Bone;
  });
  return found;
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

function Model({ speaking }: { speaking: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/jia/jia-officielle.glb");
  const { actions } = useAnimations(animations, group);
  const activeMove = useRef<Move>("idle");
  const spineRef = useRef<THREE.Object3D | null>(null);
  const bones = useMemo(() => ({
    head: findBone(scene, ["head", "neck", "mixamorighead"]),
    spine: findBone(scene, ["spine", "chest", "upperchest"]),
    leftArm: findBone(scene, ["leftarm", "leftupperarm", "arm_l", "upperarm_l"]),
    rightArm: findBone(scene, ["rightarm", "rightupperarm", "arm_r", "upperarm_r"]),
    leftHand: findBone(scene, ["lefthand", "hand_l"]),
    rightHand: findBone(scene, ["righthand", "hand_r"]),
  }), [scene]);

  useEffect(() => {
    spineRef.current = scene.getObjectByName("Spine") as THREE.Object3D | null;
  }, [scene]);

  useEffect(() => {
    const onMove = (event: Event) => {
      const next = (event as CustomEvent<{ move?: Move }>).detail?.move;
      if (next) activeMove.current = next;
      if (!next || !animations.length) return;

      const hints = MOVE_CLIP_HINTS[next] ?? [];
      const clip = animations.find((item) => hints.some((hint) => item.name.toLowerCase().includes(hint)));
      if (!clip) return;

      Object.values(actions).forEach((action) => action?.stop());
      const action = actions[clip.name];
      action?.reset().fadeIn(0.15).play();
      if (action) action.setLoop(THREE.LoopOnce, 1);
      if (action) action.clampWhenFinished = true;
    };

    window.addEventListener("jobly:jia-move", onMove);
    return () => window.removeEventListener("jobly:jia-move", onMove);
  }, [actions, animations]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    const move = activeMove.current;

    // J’IA reste ancrée : pas de rotation globale autonome.
    group.current.position.y = -1.32 + Math.sin(t * (speaking ? 2.2 : 1.1)) * (speaking ? 0.010 : 0.004);

    const targets: Array<[THREE.Bone | null, THREE.Euler]> = [];
    const head = bones.head;
    const leftArm = bones.leftArm;
    const rightArm = bones.rightArm;

    if (move === "nod_slow") targets.push([head, new THREE.Euler(THREE.MathUtils.degToRad(7), 0, 0)]);
    if (move === "shake_no") targets.push([head, new THREE.Euler(0, THREE.MathUtils.degToRad(12), 0)]);
    if (move === "think_chin") targets.push([head, new THREE.Euler(THREE.MathUtils.degToRad(-5), 0, THREE.MathUtils.degToRad(-5))]);
    if (move === "listen_tilt") targets.push([head, new THREE.Euler(0, 0, THREE.MathUtils.degToRad(-7))]);
    if (move === "point_button" || move === "point_you") targets.push([rightArm, new THREE.Euler(THREE.MathUtils.degToRad(-28), 0, THREE.MathUtils.degToRad(-20))]);
    if (move === "wave_hi" || move === "wave_bye") targets.push([rightArm, new THREE.Euler(THREE.MathUtils.degToRad(-18), 0, THREE.MathUtils.degToRad(-35))]);
    if (move === "hand_chest" || move === "scarf_touch") targets.push([leftArm, new THREE.Euler(THREE.MathUtils.degToRad(-18), 0, THREE.MathUtils.degToRad(25))]);
    if (move === "explain_open" || move === "celebrate_jump") {
      targets.push([leftArm, new THREE.Euler(THREE.MathUtils.degToRad(-18), 0, THREE.MathUtils.degToRad(18))]);
      targets.push([rightArm, new THREE.Euler(THREE.MathUtils.degToRad(-18), 0, THREE.MathUtils.degToRad(-18))]);
    }

    for (const [bone, target] of targets) {
      if (!bone) continue;
      bone.rotation.x = THREE.MathUtils.damp(bone.rotation.x, target.x, 7, delta);
      bone.rotation.y = THREE.MathUtils.damp(bone.rotation.y, target.y, 7, delta);
      bone.rotation.z = THREE.MathUtils.damp(bone.rotation.z, target.z, 7, delta);
    }

    const spine = spineRef.current;
    if (spine) {
      const breathing = Math.sin(t * (speaking ? 2.2 : 1.1)) * (speaking ? 0.012 : 0.006);
      spine.rotation.x = THREE.MathUtils.damp(spine.rotation.x, breathing, 5, delta);
    }

    // Lip-sync léger : recherche de morph targets si le GLB en possède.
    scene.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
      const names = Object.keys(mesh.morphTargetDictionary);
      const mouth = names.find((name) => /mouth|jaw|viseme|talk|open/i.test(name));
      if (!mouth) return;
      const index = mesh.morphTargetDictionary[mouth];
      const target = speaking ? (0.25 + (Math.sin(t * 18) + 1) * 0.18) : 0;
      mesh.morphTargetInfluences[index] = THREE.MathUtils.damp(mesh.morphTargetInfluences[index] ?? 0, target, 14, delta);
    });
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
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px]" aria-hidden="true">
      <JIA3DErrorBoundary
        fallback={
          <Canvas camera={{ position: [0, 0.05, 2.35], fov: 32 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
            <ambientLight intensity={1.7} />
            <directionalLight position={[2, 3, 4]} intensity={2.2} color="#fff6df" />
            <JIAProcedural3D speaking={speaking} />
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
      <JIAAppearanceOverlay appearance={appearance}/>
    </div>
  );
}

useGLTF.preload("/jia/jia-officielle.glb");

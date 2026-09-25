"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useAnimations, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

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

export default function JIA3D({ speaking }: { speaking: boolean }) {
  return (
    <div className="h-full w-full overflow-hidden rounded-[28px]" aria-hidden="true">
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
    </div>
  );
}

useGLTF.preload("/jia/jia-officielle.glb");

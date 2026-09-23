"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useRef } from "react";
import * as THREE from "three";

function Model({ speaking }: { speaking: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/jia/jia-officielle.glb");

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.position.y = Math.sin(t * (speaking ? 2.2 : 1.1)) * (speaking ? 0.012 : 0.006);
    group.current.rotation.y = Math.sin(t * 0.7) * 0.018;
    group.current.rotation.z = Math.sin(t * 0.55) * 0.008;
  });

  return <primitive ref={group} object={scene} scale={1.42} position={[0, -1.48, 0]} />;
}

export default function JIA3D({ speaking }: { speaking: boolean }) {
  return (
    <div className="h-full w-full overflow-hidden rounded-[28px]" aria-hidden="true">
      <Canvas camera={{ position: [0, 0.05, 2.35], fov: 32 }} dpr={[1, 1.5]}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[2, 3, 4]} intensity={2.1} color="#fff6df" />
        <directionalLight position={[-2, 1, 2]} intensity={0.7} color="#8fc9ff" />
        <Suspense fallback={null}>
          <Model speaking={speaking} />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/jia/jia-officielle.glb");

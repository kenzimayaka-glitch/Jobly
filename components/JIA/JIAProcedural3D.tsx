"use client";

import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

type Props = { speaking: boolean; move?: string };

/**
 * Asset-free 3D fallback for J’IA.
 * It deliberately mirrors the canonical character contract and keeps animation local,
 * so Jobly remains functional when the external GLB is unavailable.
 */
export default function JIAProcedural3D({ speaking }: Props) {
  const head = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    if (head.current) {
      head.current.rotation.y = THREE.MathUtils.damp(head.current.rotation.y, Math.sin(t * 0.45) * 0.025, 4, delta);
      head.current.rotation.z = THREE.MathUtils.damp(head.current.rotation.z, Math.sin(t * 0.7) * 0.018, 4, delta);
    }
    const breath = Math.sin(t * (speaking ? 2.2 : 1.1));
    if (leftArm.current) leftArm.current.rotation.z = THREE.MathUtils.damp(leftArm.current.rotation.z, -0.08, 4, delta);
    if (rightArm.current) rightArm.current.rotation.z = THREE.MathUtils.damp(rightArm.current.rotation.z, 0.08, 4, delta);
    if (mouth.current) mouth.current.scale.y = speaking ? 0.72 + (breath + 1) * 0.12 : 0.25;
  });

  return (
    <group position={[0, -1.25, 0]} rotation={[0, Math.PI, 0]}>
      {/* torso / blue blazer */}
      <mesh position={[0, -0.45, 0]} scale={[0.62, 0.8, 0.34]}>
        <capsuleGeometry args={[0.65, 1.15, 8, 16]} />
        <meshStandardMaterial color="#0757b8" roughness={0.62} />
      </mesh>

      {/* neck */}
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.18, 0.2, 0.35, 16]} />
        <meshStandardMaterial color="#8f5131" roughness={0.72} />
      </mesh>

      {/* head */}
      <group ref={head} position={[0, 0.78, 0]}>
        <mesh scale={[0.56, 0.67, 0.5]}>
          <sphereGeometry args={[1, 24, 18]} />
          <meshStandardMaterial color="#8f5131" roughness={0.7} />
        </mesh>
        {/* hair / crown */}
        <mesh position={[0, 0.18, -0.04]} scale={[0.62, 0.46, 0.52]}>
          <sphereGeometry args={[1, 20, 14]} />
          <meshStandardMaterial color="#211815" roughness={0.95} />
        </mesh>
        {/* glasses */}
        <mesh position={[-0.2, -0.02, 0.48]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.16, 0.018, 8, 24]} />
          <meshStandardMaterial color="#d7a83b" metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0.2, -0.02, 0.48]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.16, 0.018, 8, 24]} />
          <meshStandardMaterial color="#d7a83b" metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0, -0.02, 0.48]}>
          <boxGeometry args={[0.16, 0.018, 0.018]} />
          <meshStandardMaterial color="#d7a83b" metalness={0.7} roughness={0.25} />
        </mesh>
        {/* eyes */}
        <mesh position={[-0.2, -0.02, 0.49]} scale={[0.035, 0.035, 0.018]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#15100f" />
        </mesh>
        <mesh position={[0.2, -0.02, 0.49]} scale={[0.035, 0.035, 0.018]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#15100f" />
        </mesh>
        {/* mouth */}
        <mesh ref={mouth} position={[0, -0.25, 0.48]} scale={[0.11, 0.25, 0.025]}>
          <sphereGeometry args={[1, 16, 10]} />
          <meshStandardMaterial color="#4b211e" roughness={0.8} />
        </mesh>
      </group>

      {/* amber-gold scarf */}
      <mesh position={[0, 0.1, 0.37]} rotation={[0.08, 0, 0]} scale={[0.5, 0.32, 0.08]}>
        <torusGeometry args={[0.8, 0.18, 12, 32, Math.PI]} />
        <meshStandardMaterial color="#e1a72e" roughness={0.55} />
      </mesh>

      {/* arms */}
      <group ref={leftArm} position={[-0.55, -0.25, 0]}>
        <mesh rotation={[0, 0, -0.15]} position={[-0.18, -0.35, 0]}>
          <capsuleGeometry args={[0.13, 0.65, 6, 12]} />
          <meshStandardMaterial color="#0757b8" roughness={0.62} />
        </mesh>
        <mesh position={[-0.22, -0.73, 0]}>
          <sphereGeometry args={[0.15, 12, 10]} />
          <meshStandardMaterial color="#8f5131" roughness={0.72} />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.55, -0.25, 0]}>
        <mesh rotation={[0, 0, 0.15]} position={[0.18, -0.35, 0]}>
          <capsuleGeometry args={[0.13, 0.65, 6, 12]} />
          <meshStandardMaterial color="#0757b8" roughness={0.62} />
        </mesh>
        <mesh position={[0.22, -0.73, 0]}>
          <sphereGeometry args={[0.15, 12, 10]} />
          <meshStandardMaterial color="#8f5131" roughness={0.72} />
        </mesh>
      </group>

      {/* J’IA identity pin */}
      <mesh position={[0.38, -0.25, 0.37]}>
        <cylinderGeometry args={[0.095, 0.095, 0.035, 24]} />
        <meshStandardMaterial color="#f4c84b" metalness={0.65} roughness={0.25} />
      </mesh>
      <Text position={[0.38, -0.255, 0.395]} fontSize={0.055} color="#123b82" anchorX="center" anchorY="middle">
        J’IA
      </Text>
    </group>
  );
}

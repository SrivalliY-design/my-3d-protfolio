"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import SpaceBackground from "./SpaceBackground";
import PortfolioSections from "./PortfolioSections";
import CameraRig from "./CameraRig";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// Premium Atmosphere Dust Effect (particles are scattered in a 3D volume)
function AtmosphereDust() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 500;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20; // Spread X
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20; // Spread Y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100; // Deep Z
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (pointsRef.current) {
      const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;  //Access raw position array of particles
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 1] += delta * 0.2; // Drift up slowly
        // If it goes too high, reset to bottom
        if (pos[i * 3 + 1] > 10) {
          pos[i * 3 + 1] = -10;
        }
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;    //Without this → movement won’t render
      pointsRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#ffa500" transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

export default function Scene() {
  return (
    <div className="fixed inset-0 z-0 bg-[#050505]">
      <Canvas camera={{ position: [0, 0, 0], fov: 75 }}>
        <color attach="background" args={["#050505"]} />
        {/* Fog hides the roadmap until the camera gets within 30 units */}
        <fog attach="fog" args={["#050505", 5, 30]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} color="#ffedd5" />

        <CameraRig />
        <SpaceBackground />
        <AtmosphereDust />
        <PortfolioSections />
      </Canvas>
    </div>
  );
}

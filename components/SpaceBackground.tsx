"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function SpaceBackground() {
  const points = useRef<THREE.Points>(null);

  const particlesCount = 4000;

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(particlesCount * 3);
    const col = new Float32Array(particlesCount * 3);

    // Orange, white, and black palette
    const colorWhite = new THREE.Color("#ffffff");
    const colorOrange = new THREE.Color("#ff7a00");
    const colorDim = new THREE.Color("#333333");

    for (let i = 0; i < particlesCount; i++) {
      // X and Y spread
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      // Z spread from 10 to -150
      pos[i * 3 + 2] = (Math.random() - 0.5) * 160 - 70;

      // Randomly assign colors based on probability
      const rand = Math.random();
      let c;
      if (rand < 0.6) c = colorDim; // mostly dim background particles
      else if (rand < 0.9) c = colorWhite;
      else c = colorOrange;

      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, []);

  useFrame((state, delta) => {
    if (points.current) {
      // Base gentle rotation
      const baseRotZ = delta * 0.02;
      const baseRotY = delta * 0.01;

      points.current.rotation.z += baseRotZ;
      points.current.rotation.y += baseRotY;

      // Premium Mouse Parallax Effect
      // Calculate target rotation based on mouse position (-1 to 1)
      const targetX = (state.pointer.y * Math.PI) / 20; // Look up/down
      const targetY = (state.pointer.x * Math.PI) / 20; // Look left/right

      // Smoothly interpolate current rotation to target rotation
      points.current.rotation.x += (targetX - points.current.rotation.x) * delta * 2;
      points.current.rotation.y += (targetY - points.current.rotation.y) * delta * 2;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        fog={false}
      />
    </points>
  );
}

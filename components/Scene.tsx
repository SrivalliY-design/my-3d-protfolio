"use client";

import { Canvas } from "@react-three/fiber";
import SpaceBackground from "./SpaceBackground";
import PortfolioSections from "./PortfolioSections";
import CameraRig from "./CameraRig";

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
        <PortfolioSections />
      </Canvas>
    </div>
  );
}

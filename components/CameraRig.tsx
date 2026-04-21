"use client";

import { useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function CameraRig() {
  const { camera } = useThree();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Reset camera position on mount
    camera.position.set(0, 2, 10);     //X = 0 (center), Y = 2 (slightly above), Z = 10 (far away from scene)
    camera.rotation.set(-Math.PI / 16, 0, 0);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: document.body,   //Entire page controls scroll
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5,      //Smooth linking between scroll & animation
      },
    });

    // Move camera deeply into the z-axis, stop exactly before the final card
    tl.to(camera.position, {
      z: -75, // Scroll down → camera moves:
      ease: "none",
    });

    // Add a slight banking effect when moving through the curve
    tl.to(camera.rotation, {
      z: Math.PI / 48, // very subtle tilt
      ease: "sine.inOut"
    }, 0);

    // Fade out hero section quickly when starting to scroll
    gsap.to("#hero-section", {
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "10% top",
        scrub: true,
      },
      opacity: 0,
      y: -50,
      scale: 0.95,
      ease: "none"
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [camera]);

  // Premium Camera Breathing Effect
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    // Add a gentle floating motion to the camera independent of scroll
    camera.position.x = Math.sin(time * 0.5) * 0.15;
    // Base Y is 2, oscillate slightly around it
    camera.position.y = 2 + Math.sin(time * 0.4) * 0.1;
  });

  return null;             //Component doesn’t render UI, only controls camera behavior.
}

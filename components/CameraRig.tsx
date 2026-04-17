"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function CameraRig() {
  const { camera } = useThree();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Start camera further back (z=10) so the first node (z=-25) is perfectly hidden by the fog!
    camera.position.set(0, 2, 10);
    camera.rotation.set(-Math.PI / 16, 0, 0);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5,
      },
    });

    // Move camera deeply into the z-axis, stop exactly before the final card
    tl.to(camera.position, {
      z: -75, // Stops perfectly at a distance of 5 from the final card (z=-80)
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

  return null;
}

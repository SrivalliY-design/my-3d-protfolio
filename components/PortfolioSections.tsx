"use client";

import { Html, Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";

function FadeHtml({ z, children, align }: { z: number, children: React.ReactNode, align: 'left' | 'right' | 'center' }) {
  const ref = useRef<HTMLDivElement>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (ref.current) {
      // Calculate distance from camera on the Z axis
      const distance = z - camera.position.z;

      let opacity = 0;
      let blur = 10;
      let scale = 0.8;

      let xOffset = 0;
      // Slight vertical lift
      let yOffset = -50;

      if (distance < -4 && distance > -15) {
        // Fade in when getting closer
        const progress = (distance + 15) / 11; // 0 to 1

        opacity = Math.min(1, progress * 1.5);
        // Drop blur to 0 much faster so it's perfectly crisp before stopping
        blur = Math.max(0, 10 - (progress * 20));
        scale = 0.8 + (progress * 0.2);

        // Gentle Slide in
        if (align === 'left') xOffset = -100 * (1 - progress);
        else if (align === 'right') xOffset = 100 * (1 - progress);
        else yOffset = -50 + 100 * (1 - progress);

      } else if (distance >= -4 && distance < 8) {
        // Fade out quickly when passing it
        const progress = 1 - ((distance + 4) / 12);
        opacity = Math.max(0, progress);
        blur = 0;
        scale = 1 + ((1 - progress) * 0.1);

        // Slide out slightly
        if (align === 'left') xOffset = -50 * (1 - progress);
        else if (align === 'right') xOffset = 50 * (1 - progress);
        else yOffset = -50 - 50 * (1 - progress);
      } else {
        // Completely hidden
        opacity = 0;
      }

      // Push the card 22% of the screen width to the left or right!
      const vwOffset = align === 'left' ? -22 : align === 'right' ? 22 : 0;

      ref.current.style.opacity = opacity.toString();
      ref.current.style.filter = `blur(${blur}px)`;
      ref.current.style.transform = `translate3d(calc(${xOffset}px + ${vwOffset}vw), ${yOffset}px, 0) scale(${scale})`;
      ref.current.style.pointerEvents = opacity > 0.5 ? "auto" : "none";

      // Trigger inner content animations when the card becomes reasonably visible
      if (opacity > 0.3) {
        ref.current.classList.add('is-visible');
      } else {
        ref.current.classList.remove('is-visible');
      }
    }
  });

  // We anchor the HTML exactly at Z, but X and Y are 0. The CSS transform handles the layout!
  return (
    <Html position={[0, 0, z]} center distanceFactor={10} zIndexRange={[100, 0]}>
      <div ref={ref} className="transition-all duration-75 will-change-transform opacity-0">
        {children}
      </div>
    </Html>
  );
}

// PREMIUM ANIMATED TUBE LINE
const GlowingLine = ({ curve }: { curve: THREE.Curve<THREE.Vector3> }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value += delta;

      // Fade in the line only after the user starts scrolling
      // Camera starts at Z = 10.
      const camZ = state.camera.position.z;
      let fadeOpacity = 1.0;

      if (camZ > 7) {
        // camZ goes from 10 down to -75.
        // Between Z=10 and Z=9.5, opacity is 0. 
        // Between Z=9.5 and Z=7, it fades to 1.
        fadeOpacity = Math.max(0, Math.min(1, (9.5 - camZ) / 2.5));
      }

      materialRef.current.uniforms.uFade.value = fadeOpacity;
    }
  });

  return (
    <mesh>
      <tubeGeometry args={[curve, 250, 0.03, 8, false]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        toneMapped={false}
        uniforms={{
          uTime: { value: 0 },
          uColor: { value: new THREE.Color("#ffa500") }, // Pure bright orange
          uFade: { value: 0 },
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          varying vec2 vUv;
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uFade;
          void main() {
            // Create a flowing energy pulse along the tube
            float dash = fract(vUv.x * 15.0 - uTime * 1.5);
            float intensity = smoothstep(0.0, 0.2, dash) * smoothstep(1.0, 0.8, dash);
            
            // Output pure color with alpha, multiplied by global scroll fade
            float baseAlpha = 0.2 + intensity * 0.8;
            gl_FragColor = vec4(uColor, baseAlpha * uFade);
          }
        `}
      />
    </mesh>
  );
};

// PREMIUM PULSING NODE
const GlowingNode = ({ position, connectTo }: { position: [number, number, number], connectTo?: 'left' | 'right' }) => {
  const haloRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (haloRef.current) {
      // Pulse scale
      const scale = 1 + Math.sin(time * 3) * 0.15;
      haloRef.current.scale.set(scale, scale, scale);

      // Pulse opacity
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(time * 3) * 0.2;
    }

    // Animate rings expanding and fading
    if (ring1Ref.current) {
      const p = (time * 0.5) % 1;
      ring1Ref.current.scale.setScalar(1 + p * 3);
      (ring1Ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.5;
    }
    if (ring2Ref.current) {
      const p = ((time * 0.5) + 0.5) % 1;
      ring2Ref.current.scale.setScalar(1 + p * 3);
      (ring2Ref.current.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.5;
    }
  });

  return (
    <mesh position={position}>
      {/* Core */}
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} />

      {/* Connector Beam to the HTML Card */}
      {connectTo && (
        <mesh position={[connectTo === 'left' ? -3 : 3, 0, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.01, 0.01, 6, 8]} />
          <meshBasicMaterial color="#ffa500" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {/* Pulsing Halo */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial color="#ffa500" transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Expanding shockwave rings! */}
      <mesh ref={ring1Ref} rotation-x={Math.PI / 2}>
        <ringGeometry args={[0.2, 0.25, 32]} />
        <meshBasicMaterial color="#ffa500" transparent opacity={0} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={ring2Ref} rotation-x={Math.PI / 2}>
        <ringGeometry args={[0.2, 0.25, 32]} />
        <meshBasicMaterial color="#ffa500" transparent opacity={0} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    </mesh>
  );
};

// PREMIUM CARD (Tilt removed per user request)
const PremiumCard = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={`transition-all duration-300 ease-out ${className || ''}`}>
      {children}
    </div>
  );
};

export default function PortfolioSections() {
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, -5),
      new THREE.Vector3(0, 0, -10),
      new THREE.Vector3(-1.8, 0, -20), // Gentler curves!
      new THREE.Vector3(1.8, 0, -35),
      new THREE.Vector3(-1.8, 0, -50),
      new THREE.Vector3(1.8, 0, -65),
      new THREE.Vector3(0, 0, -80),
    ], false, 'catmullrom', 0.5);
  }, []);

  const nodes: { z: number, x: number, align: 'left' | 'right' | 'center' }[] = [
    { z: -20, x: -1.8, align: 'right' }, // Card is right, so connect to right
    { z: -35, x: 1.8, align: 'left' },   // Card is left, so connect to left
    { z: -50, x: -1.8, align: 'right' },
    { z: -65, x: 1.8, align: 'left' },
  ];

  return (
    <group>
      {/* Premium Animated Flowing Energy Line */}
      <GlowingLine curve={curve} />

      {/* Premium Pulsing Nodes */}
      {nodes.map((n) => (
        <GlowingNode key={n.z} position={[n.x, 0, n.z]} connectTo={n.align === 'center' ? undefined : n.align} />
      ))}

      {/* Objective - Node is Left (-2.5), so Card goes RIGHT */}
      <FadeHtml z={-20} align="right">
        <PremiumCard className="glass-card w-80 md:w-[38rem] p-10 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(255,122,0,0.1)] hover:shadow-[0_0_80px_rgba(255,122,0,0.4)] text-left hover:border-[#ff7a00]/80">
          <h2 className="reveal-item text-4xl md:text-5xl font-black mb-6 tracking-tight bg-gradient-to-r from-white via-[#ff7a00] to-white bg-clip-text text-transparent animate-gradient-x">Objective</h2>
          <div className="reveal-item delay-100 w-16 h-1.5 bg-[#ff7a00] mb-8 rounded-full" />
          <p className="reveal-item delay-200 text-zinc-300 leading-relaxed text-lg md:text-xl font-light">
            To utilize my technical skills and provide a professional service to customers by applying and honing my knowledge in a challenging and motivating working environment.
          </p>
        </PremiumCard>
      </FadeHtml>

      {/* Skills - Node is Right (2.5), so Card goes LEFT */}
      <FadeHtml z={-35} align="left">
        <PremiumCard className="glass-card w-80 md:w-[42rem] p-10 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(255,122,0,0.1)] hover:shadow-[0_0_80px_rgba(255,122,0,0.4)] text-left hover:border-[#ff7a00]/80">
          <h2 className="reveal-item text-4xl md:text-5xl font-black mb-6 tracking-tight bg-gradient-to-r from-white via-[#ff7a00] to-white bg-clip-text text-transparent animate-gradient-x">Technical Skills</h2>
          <div className="reveal-item delay-100 w-16 h-1.5 bg-[#ff7a00] mb-8 rounded-full" />
          <div className="flex flex-wrap gap-4">
            {['Core Java', 'HTML5', 'CSS3', 'MySQL', 'JavaScript', 'React.js', 'Next.js', 'Tailwind CSS'].map((skill, i) => (
              <span key={skill} className="reveal-item px-6 py-3 rounded-full bg-white/5 text-white text-base md:text-lg border border-white/10 hover:border-[#ff7a00] hover:text-[#fff0d4] transition-all duration-300 cursor-default hover:[text-shadow:0_0_15px_rgba(255,255,255,0.8)] hover:-translate-y-1" style={{ transitionDelay: `${200 + i * 50}ms` }}>
                {skill}
              </span>
            ))}
          </div>
        </PremiumCard>
      </FadeHtml>

      {/* Experience - Node is Left (-2.5), so Card goes RIGHT */}
      <FadeHtml z={-50} align="right">
        <PremiumCard className="glass-card w-80 md:w-[44rem] p-10 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(255,122,0,0.1)] hover:shadow-[0_0_80px_rgba(255,122,0,0.4)] text-left hover:border-[#ff7a00]/80">
          <h2 className="reveal-item text-4xl md:text-5xl font-black mb-6 tracking-tight bg-gradient-to-r from-white via-[#ff7a00] to-white bg-clip-text text-transparent animate-gradient-x">Experience</h2>
          <div className="reveal-item delay-100 w-16 h-1.5 bg-[#ff7a00] mb-8 rounded-full" />
          <div className="space-y-8 w-full">
            <div className="reveal-item delay-200 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#ff7a00] transition-all cursor-default group">
              <h3 className="text-2xl font-bold text-white mb-2 transition-all duration-300 group-hover:text-[#fff0d4] group-hover:[text-shadow:0_0_15px_rgba(255,255,255,0.8)]">Frontend Developer</h3>
              <p className="text-[#ff7a00] font-medium mb-3 tracking-wider text-sm">GEEKONOMY TECHNOLOGIES</p>
              <p className="text-lg text-zinc-400 font-light leading-relaxed">Frontend Developer specializing in building immersive, high-performance web experiences using modern technologies like React, Next.js, and Three.js. Focused on creating visually engaging interfaces with smooth animations and intuitive user interactions.</p>
            </div>
            <div className="reveal-item delay-200 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#ff7a00] transition-all cursor-default group">
              <h3 className="text-2xl font-bold text-white mb-2 transition-all duration-300 group-hover:text-[#fff0d4] group-hover:[text-shadow:0_0_15px_rgba(255,255,255,0.8)]">Frontend Developer Intern</h3>
              <p className="text-[#ff7a00] font-medium mb-3 tracking-wider text-sm">GEEKONOMY TECHNOLOGIES</p>
              <p className="text-lg text-zinc-400 font-light leading-relaxed">Built web apps using HTML, CSS, JavaScript, and React.js. Created UI components, optimized apps for speed, and ensured responsive design.</p>
            </div>
            <div className="reveal-item delay-300 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#ff7a00] transition-all cursor-default group">
              <h3 className="text-2xl font-bold text-white mb-2 transition-all duration-300 group-hover:text-[#fff0d4] group-hover:[text-shadow:0_0_15px_rgba(255,255,255,0.8)]">Full stack Developer Intern</h3>
              <p className="text-[#ff7a00] font-medium mb-3 tracking-wider text-sm">TAP ACADEMY</p>
              <p className="text-lg text-zinc-400 font-light leading-relaxed">Completed 400+ hours learning core Java, front-end basics, MySQL, and gained exposure to Spring Boot and Hibernate frameworks.</p>
            </div>
          </div>
        </PremiumCard>
      </FadeHtml>

      {/* Projects - Node is Right (2.5), so Card goes LEFT */}
      <FadeHtml z={-65} align="left">
        <PremiumCard className="glass-card w-80 md:w-[46rem] p-10 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(255,122,0,0.1)] hover:shadow-[0_0_80px_rgba(255,122,0,0.4)] text-left hover:border-[#ff7a00]/80">
          <h2 className="reveal-item text-4xl md:text-5xl font-black mb-6 tracking-tight bg-gradient-to-r from-white via-[#ff7a00] to-white bg-clip-text text-transparent animate-gradient-x">Projects</h2>
          <div className="reveal-item delay-100 w-16 h-1.5 bg-[#ff7a00] mb-8 rounded-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <div className="reveal-item delay-200 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#ff7a00] hover:-translate-y-2 transition-all duration-300 cursor-default group">
              <h3 className="text-xl font-bold text-white mb-3 transition-all duration-300 group-hover:text-[#fff0d4] group-hover:[text-shadow:0_0_15px_rgba(255,255,255,0.8)]">Online Bookstore</h3>
              <p className="text-base text-zinc-400 font-light leading-relaxed">Full-stack application for buying and selling books, with admin tools for inventory and orders.</p>
            </div>
            <div className="reveal-item delay-300 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#ff7a00] hover:-translate-y-2 transition-all duration-300 cursor-default group">
              <h3 className="text-xl font-bold text-white mb-3 transition-all duration-300 group-hover:text-[#fff0d4] group-hover:[text-shadow:0_0_15px_rgba(255,255,255,0.8)]">Colorization of Images</h3>
              <p className="text-base text-zinc-400 font-light leading-relaxed">Deep learning-based project predicting appropriate colors for each pixel to enhance visual content.</p>
            </div>
            <div className="reveal-item delay-400 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#ff7a00] hover:-translate-y-2 transition-all duration-300 cursor-default group md:col-span-2">
              <h3 className="text-xl font-bold text-white mb-3 transition-all duration-300 group-hover:text-[#fff0d4] group-hover:[text-shadow:0_0_15px_rgba(255,255,255,0.8)]">RL For Self-driving Car</h3>
              <p className="text-base text-zinc-400 font-light leading-relaxed">Advanced AI project using reinforcement learning to teach autonomous vehicles optimal driving behavior.</p>
            </div>
          </div>
        </PremiumCard>
      </FadeHtml>

      {/* Contact Section - CENTER END */}
      <FadeHtml z={-80} align="center">
        <PremiumCard className="glass-card w-96 md:w-[32rem] p-12 rounded-3xl bg-black/60 backdrop-blur-2xl border border-[#ff7a00]/30 shadow-[0_0_60px_rgba(255,122,0,0.2)] hover:shadow-[0_0_100px_rgba(255,122,0,0.6)] text-center flex flex-col items-center">
          <h2 className="reveal-item text-5xl md:text-6xl font-black mb-6 tracking-tighter bg-gradient-to-r from-white via-[#ff7a00] to-white bg-clip-text text-transparent animate-gradient-x">Let's Connect</h2>
          <div className="reveal-item delay-100 w-16 h-1.5 bg-[#ff7a00] mb-8 rounded-full" />
          <p className="reveal-item delay-200 text-xl text-zinc-300 mb-3 font-medium transition-all duration-300 hover:text-[#fff0d4] hover:[text-shadow:0_0_15px_rgba(255,255,255,0.8)]">srivalli.aiml.rymec@gmail.com</p>
          <p className="reveal-item delay-300 text-xl text-zinc-400 mb-10 font-light transition-all duration-300 hover:text-[#fff0d4] hover:[text-shadow:0_0_15px_rgba(255,255,255,0.8)]">+91 8088393755</p>
          <div className="reveal-item delay-400 flex justify-center gap-6 w-full">
            <a href="https://github.com/SrivalliYaarlagadda" target="_blank" rel="noreferrer" className="flex-1 py-4 text-lg rounded-full bg-white text-black font-bold hover:bg-zinc-200 transition-all pointer-events-auto text-center hover:shadow-[0_0_20px_rgba(255,255,255,0.8)] hover:scale-105">
              GitHub
            </a>
            <a href="https://www.linkedin.com/in/srivalli-yaarlagadda-1000b3258" target="_blank" rel="noreferrer" className="flex-1 py-4 text-lg rounded-full bg-[#ff7a00] text-white font-bold hover:bg-[#e66e00] transition-all shadow-[0_0_20px_rgba(255,122,0,0.4)] hover:shadow-[0_0_40px_rgba(255,122,0,0.8)] hover:scale-105 pointer-events-auto text-center hover:text-[#fff0d4] hover:[text-shadow:0_0_15px_rgba(255,255,255,0.8)]">
              LinkedIn
            </a>
          </div>
        </PremiumCard>
      </FadeHtml>
    </group>
  );
}

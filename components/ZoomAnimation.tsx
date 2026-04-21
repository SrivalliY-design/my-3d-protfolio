"use client";



import { useEffect, useRef, useState } from "react";

import * as THREE from "three";



/* ─── CSS ANIMATIONS ─────────────────────────────────────────── */

const slideInKeyframes = `

  @keyframes slideIn {

    from {

      opacity: 0;

      transform: translateX(-100%);

    }

    to {

      opacity: 1;

      transform: translateX(0);

    }

  }

`;



/* ─── UTILS ─────────────────────────────────────────────────── */

function clamp01(v: number) {

  return Math.min(1, Math.max(0, v));

}



function lerp(a: number, b: number, t: number) {

  return a + (b - a) * t;

}



function easeInOutCubic(t: number) {

  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

}



function easeOutQuint(t: number) {

  return 1 - Math.pow(1 - t, 5);

}



function easeOutCubic(t: number) {

  return 1 - Math.pow(1 - t, 3);

}



/* ─── NOISE TEXTURE ─────────────────────────────────────────── */

function makeNoiseTexture(size = 128) {

  const d = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {

    for (let x = 0; x < size; x++) {

      const i = (y * size + x) * 4;

      const n = (Math.sin(x * 0.42) * Math.cos(y * 0.36) + Math.sin(x * 0.09 + y * 0.11) * 0.4 + 1) * 0.5;

      const v = Math.floor(clamp01((38 + n * 110 + (Math.random() - 0.5) * 22) / 255) * 255);

      d[i] = d[i + 1] = d[i + 2] = v;

      d[i + 3] = 255;

    }

  }

  const t = new THREE.DataTexture(d, size, size, THREE.RGBAFormat);

  t.wrapS = THREE.RepeatWrapping;

  t.wrapT = THREE.RepeatWrapping;

  t.repeat.set(4, 4);

  t.needsUpdate = true;

  return t;

}



/* ─── ARCH CURVE ────────────────────────────────────────────── */

class ArchCurve extends THREE.Curve<THREE.Vector3> {

  constructor(

    private readonly cx: number,

    private readonly cy: number,

    private readonly rx: number,

    private readonly ry: number

  ) {

    super();

  }



  override getPoint(t: number, out = new THREE.Vector3()) {

    const a = Math.PI * (1 - t);

    return out.set(this.cx + this.rx * Math.cos(a), this.cy + this.ry * Math.sin(a), 0);

  }

}



export default function ZoomAnimation() {

  const hostRef = useRef<HTMLDivElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const overlayRef = useRef<HTMLDivElement | null>(null);

  const overlayContentRef = useRef<HTMLDivElement | null>(null);

  const hintRef = useRef<HTMLDivElement | null>(null);

  const contentSectionRef = useRef<HTMLDivElement | null>(null);

  const [zoomed, setZoomed] = useState(false);



  useEffect(() => {

    const host = hostRef.current;

    const canvas = canvasRef.current;

    if (!host || !canvas) return;



    let raf = 0;

    let disposed = false;



    /* ─── THREE.JS SETUP ─────────────────────────────────────────── */

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    renderer.outputColorSpace = THREE.SRGBColorSpace;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure = 1.1;



    const scene = new THREE.Scene();

    scene.background = new THREE.Color(0x000000);



    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);

    camera.position.set(0, 0.1, 6);



    function resize() {

      const W = window.innerWidth;

      const H = window.innerHeight;

      renderer.setSize(W, H);

      camera.aspect = W / H;

      camera.updateProjectionMatrix();

    }

    resize();

    window.addEventListener("resize", resize);



    /* ─── BUILD DOOR ─────────────────────────────────────────────── start*/

    const bumpTex = makeNoiseTexture();

    const stoneMat = new THREE.MeshStandardMaterial({

      color: 0x101012,

      roughness: 0.96,

      metalness: 0.05,

      bumpMap: bumpTex,

      bumpScale: 0.09,

    });



    const SPRING_Y = 0.92,

      SILL_Y = -0.9,

      ARX = 0.88,

      ARY = 0.6;

    const pillarH = SPRING_Y - SILL_Y;

    const pillarCy = (SPRING_Y + SILL_Y) * 0.5;

    const FLOOR_Y = SILL_Y - 0.1;



    // Pillars

    const pillarGeo = new THREE.BoxGeometry(0.28, pillarH, 0.38);

    const lPillar = new THREE.Mesh(pillarGeo, stoneMat);

    const rPillar = new THREE.Mesh(pillarGeo, stoneMat);

    lPillar.position.set(-ARX, pillarCy, 0);

    rPillar.position.set(ARX, pillarCy, 0);



    // Arch tube

    const archTube = new THREE.TubeGeometry(new ArchCurve(0, SPRING_Y, ARX, ARY), 120, 0.155, 12, false);

    const archMesh = new THREE.Mesh(archTube, stoneMat);



    // Portal glow (white fill inside arch)

    const portalShape = new THREE.Shape();

    portalShape.moveTo(-ARX, SILL_Y);

    portalShape.lineTo(ARX, SILL_Y);

    portalShape.lineTo(ARX, SPRING_Y);

    portalShape.absellipse(0, SPRING_Y, ARX, ARY, 0, Math.PI, false, 0);

    portalShape.lineTo(-ARX, SPRING_Y);

    portalShape.lineTo(-ARX, SILL_Y);

    const glowGeo = new THREE.ShapeGeometry(portalShape, 60);

    const glowMesh = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ color: 0xf5f4f0, side: THREE.DoubleSide }));

    glowMesh.position.z = -0.28;



    const door = new THREE.Group();

    door.add(lPillar, rPillar, archMesh, glowMesh);

    scene.add(door);



    // Floor

    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x060608, roughness: 1 }));

    floorMesh.rotation.x = -Math.PI / 2;

    floorMesh.position.y = FLOOR_Y;

    scene.add(floorMesh);



    // Floor reflection (mirror of glow, fading)

    const reflGeo = glowGeo.clone();

    const reflPos = reflGeo.attributes.position;

    for (let i = 0; i < reflPos.count; i++) reflPos.setY(i, 2 * FLOOR_Y - reflPos.getY(i));

    reflPos.needsUpdate = true;

    // fix winding

    if (reflGeo.index) {

      const idx = reflGeo.index;

      for (let i = 0; i < idx.count; i += 3) {

        const b = idx.getX(i + 1),

          c = idx.getX(i + 2);

        idx.setX(i + 1, c);

        idx.setX(i + 2, b);

      }

      idx.needsUpdate = true;

    }

    reflGeo.computeVertexNormals();

    const reflMat = new THREE.ShaderMaterial({

      uniforms: { uFadeLo: { value: FLOOR_Y - 3 }, uFadeHi: { value: FLOOR_Y - 0.02 }, uCol: { value: new THREE.Color(0.47, 0.53, 0.64) } },

      vertexShader: `varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,

      fragmentShader: `uniform vec3 uCol;uniform float uFadeLo,uFadeHi;varying vec3 vW;void main(){float t=smoothstep(uFadeLo,uFadeHi,vW.y);if(t<.01)discard;gl_FragColor=vec4(uCol*(.25+.55*t),t*.35);}`,

      transparent: true,

      depthWrite: false,

      side: THREE.DoubleSide,

      toneMapped: false,

    });

    const reflMesh = new THREE.Mesh(reflGeo, reflMat);

    reflMesh.position.z = -0.28;

    door.add(reflMesh);



    // Threshold (black strip at base)

    const thresh = new THREE.Mesh(new THREE.BoxGeometry(5, 0.015, 0.06), new THREE.MeshBasicMaterial({ color: 0x000000 }));

    thresh.position.set(0, FLOOR_Y + 0.01, 0.8);

    scene.add(thresh);



    // Lights

    scene.add(new THREE.AmbientLight(0x181820, 0.25));

    const pLight = new THREE.PointLight(0xffffff, 5, 18, 1.6);

    pLight.position.set(0, 0.4, -1.2);

    door.add(pLight);

    const fillL = new THREE.DirectionalLight(0xb8c4e8, 0.4);

    fillL.position.set(-4, 8, 6);

    scene.add(fillL);

    const rimL = new THREE.DirectionalLight(0x4466aa, 0.25);

    rimL.position.set(5, 2, -4);

    scene.add(rimL);



    // Inner room back wall (glimpsed as you fly through)

    const innerGroup = new THREE.Group();

    innerGroup.visible = false;

    innerGroup.position.set(0, 0, -50);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(80, 50), new THREE.MeshBasicMaterial({ color: 0xf5f4f0 }));

    backWall.position.z = -10;

    innerGroup.add(backWall);

    scene.add(innerGroup);



    /* ─── SCROLL / POINTER STATE ─────────────────────────────────── */

    let tScroll = 0,

      sScroll = 0,

      ptr = { x: 0, y: 0 },

      ptrT = { x: 0, y: 0 };

    const onScroll = () => {

      tScroll = window.scrollY;

    };

    const onPointerMove = (e: PointerEvent) => {

      ptrT.x = (e.clientX / window.innerWidth) * 2 - 1;

      ptrT.y = -(e.clientY / window.innerHeight) * 2 + 1;

    };



    window.addEventListener("scroll", onScroll, { passive: true });

    window.addEventListener("pointermove", onPointerMove, { passive: true });



    /* ─── DOM REFS ───────────────────────────────────────────────── */

    const overlay = overlayRef.current;

    const overlayContent = overlayContentRef.current;

    const hint = hintRef.current;

    const contentSection = contentSectionRef.current;

    const canvasWrap = host;



    const SCROLL_VH = 4.0; // matches height:400vh on spacer



    /* ─── MAIN RENDER LOOP ───────────────────────────────────────── */

    function tick() {

      if (disposed) return;

      raf = requestAnimationFrame(tick);



      sScroll += (tScroll - sScroll) * 0.085;

      ptr.x += (ptrT.x - ptr.x) * 0.08;

      ptr.y += (ptrT.y - ptr.y) * 0.08;



      const totalPx = window.innerHeight * SCROLL_VH;

      const rawP = clamp01(sScroll / totalPx); // 0 → 1 over entire scroll zone

      const p = easeInOutCubic(rawP);



      /* ── Phase 1: approach (0 → 0.62) ── */

      const approach = clamp01(rawP / 0.62);

      const aP = easeInOutCubic(approach);



      // Camera: start far, zoom close to door

      camera.position.z = lerp(6, 0.35, aP);

      camera.position.y = lerp(0.1, -0.04, aP);



      // Gentle mouse parallax

      door.rotation.y = ptr.x * lerp(0.12, 0.015, aP);

      door.rotation.x = ptr.y * lerp(0.07, 0.01, aP);



      // Door scales up slightly as you approach

      door.scale.setScalar(lerp(1, 1.22, aP));



      /* ── Phase 2: entering portal (0.62 → 1.0) ── */

      const enterRaw = clamp01((rawP - 0.62) / 0.38);

      const enter = easeOutQuint(enterRaw);



      // Once we're entering, camera flies forward through the opening

      if (enterRaw > 0) {

        camera.position.z = lerp(0.35, -12, enter); // fly through

        camera.position.y = lerp(-0.04, 0.05, enter);

      }

      camera.lookAt(0, lerp(0.08, 0.02, p), -p * 8);



      // Inner room reveals

      innerGroup.visible = enterRaw > 0.05;

      innerGroup.position.z = lerp(-50, -5, enter);



      // Door/floor hide as we fly through

      door.visible = enterRaw < 0.75;

      floorMesh.visible = enterRaw < 0.6;

      thresh.visible = enterRaw < 0.5;



      // ── WHITE OVERLAY: appears instantly when entering room starts ──

      if (overlay) {

        overlay.style.opacity = enter > 0 ? "1" : "0";

      }



      // Content slides in from left/right immediately after entering the room

      if (overlayContent) {

        // Content starts appearing immediately when entering phase begins

        const contentT = clamp01(enter / 0.8);

        const slideX = (1 - easeOutCubic(contentT)) * 100;

        overlayContent.style.opacity = String(contentT);

        overlayContent.style.transform = `translateX(-${slideX}%)`;

      }



      // Scroll hint

      if (hint) {

        hint.style.opacity = String(clamp01(1 - approach * 2));

      }



      // Canvas behind overlay: dim to nothing as white takes over

      if (canvasWrap) {

        canvasWrap.style.opacity = String(clamp01(1 - enter * 1.2));

      }



      /* ── HANDOFF: once fully entered, switch to static page ── */

      if (rawP >= 0.995 && !zoomed) {

        setZoomed(true);

        if (contentSection) {

          contentSection.classList.add("active");

        }

        if (overlay) {

          overlay.style.display = "none";

        }

        if (canvasWrap) {

          canvasWrap.style.display = "none";

        }

      }

      if (rawP < 0.99 && zoomed) {

        setZoomed(false);

        if (contentSection) {

          contentSection.classList.remove("active");

        }

        if (overlay) {

          overlay.style.display = "";

        }

        if (canvasWrap) {

          canvasWrap.style.display = "";

        }

      }



      renderer.render(scene, camera);

    }



    tick();



    return () => {

      disposed = true;

      cancelAnimationFrame(raf);

      window.removeEventListener("scroll", onScroll);

      window.removeEventListener("pointermove", onPointerMove);

      window.removeEventListener("resize", resize);



      renderer.dispose();

      bumpTex.dispose();

      pillarGeo.dispose();

      archTube.dispose();

      stoneMat.dispose();

      glowGeo.dispose();

      reflGeo.dispose();

      reflMat.dispose();

      floorMesh.geometry.dispose();

      floorMesh.material.dispose();

      backWall.geometry.dispose();

      backWall.material.dispose();

    };

  }, [zoomed]);



  return (

    <>

      <style>{slideInKeyframes}</style>

      {/* Scroll spacer (drives zoom via scrollY) */}

      <div style={{ height: "400vh", position: "relative", zIndex: 0 }} />



      {/* 3D Canvas */}

      <div ref={hostRef} style={{ position: "fixed", inset: 0, zIndex: 1 }}>

        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />

      </div>



      {/* Scroll hint */}

      <div ref={hintRef} style={{ position: "fixed", bottom: "28px", right: "32px", zIndex: 50, color: "rgba(255,255,255,0.38)", fontFamily: "ui-monospace, monospace", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", pointerEvents: "none", transition: "opacity 0.3s" }}>

        Scroll to explore

      </div>



      {/* White overlay: simple fade in */}

      <div ref={overlayRef} style={{ position: "fixed", inset: 0, zIndex: 10, background: "#f5f4f0", opacity: 0, pointerEvents: "none", willChange: "opacity" }}>

        <div ref={overlayContentRef} style={{ opacity: 0, transform: "translateX(-100%)", transition: "none", minHeight: "100vh", overflowY: "auto" }}>

          <div className="hero inner" style={{ textAlign: "center", padding: "7rem 2rem 4.5rem" }}>

            <h1 style={{ fontSize: "clamp(2.8rem, 6vw, 5rem)", fontWeight: 300, lineHeight: 1.08, letterSpacing: "-0.02em", color: "#1c1a17", marginBottom: "1.4rem" }}>

              Welcome to about section

            </h1>

          </div>

        </div>

      </div>



      {/* Static page (takes over after zoom done) */}

      <div ref={contentSectionRef} id="content-section" style={{ display: "none", background: "#f5f4f0", position: "relative", zIndex: 5 }} className={!zoomed ? "" : "active"}>

        <div className="hero inner" style={{ textAlign: "center", padding: "7rem 2rem 4.5rem", animation: zoomed ? "slideIn 0.8s ease-out forwards" : "none" }}>

          <h1 style={{ fontSize: "clamp(2.8rem, 6vw, 5rem)", fontWeight: 300, lineHeight: 1.08, letterSpacing: "-0.02em", color: "#1c1a17", marginBottom: "1.4rem" }}>

            Welcome to about section

          </h1>

        </div>

      </div>

    </>

  );

}
import Scene from "@/components/Scene";
export default function Home() {
  return (
    <main className="relative w-full bg-[#050505]">
      {/* Hero Section fixed on top of Canvas, perfectly sharp */}
      <div id="hero-section" className="fixed inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
        <h1 className="text-7xl md:text-[9rem] font-black tracking-tighter mb-4 drop-shadow-2xl bg-gradient-to-r from-white via-[#ff7a00] to-white bg-clip-text text-transparent animate-gradient-x">
          SRIVALLI Y
        </h1>
        <p className="text-2xl md:text-4xl text-zinc-300 font-light tracking-widest mt-2">
          Full Stack & Frontend Developer
        </p>
        <div className="mt-20 flex flex-col items-center gap-4">
          <p className="text-sm md:text-base uppercase tracking-[0.4em] text-[#ff7a00] font-bold">Scroll to explore</p>
          <div className="w-[2px] h-32 bg-gradient-to-b from-[#ff7a00] to-transparent animate-pulse" />
        </div>
      </div>
      <div className="fixed inset-0 z-0">
        <Scene />
      </div>
      {/* Scroll spacer to create a tall page for GSAP to track */}
      <div className="h-[600vh] w-full pointer-events-none relative z-20" />
    </main>
  );
}

// import ZoomAnimation from "@/components/ZoomAnimation";

// export default function Home() {
//   return <ZoomAnimation />;
// }

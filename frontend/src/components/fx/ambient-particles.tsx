import { useEffect, useRef } from "react";

/**
 * Ambient drifting particles — fixed full-screen canvas behind the app.
 * Lightweight: ~40 specks, GPU-friendly, respects reduced motion.
 */
export function AmbientParticles() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    const N = 42;
    const parts: P[] = [];

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const init = () => {
      parts.length = 0;
      for (let i = 0; i < N; i++) {
        parts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.18,
          vy: -0.05 - Math.random() * 0.25,
          r: 0.6 + Math.random() * 1.6,
          a: 0.15 + Math.random() * 0.35,
        });
      }
    };

    resize();
    init();
    window.addEventListener("resize", resize);

    const color = () => {
      // read primary token at runtime so it matches theme
      const v = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
      return v || "oklch(0.85 0.15 85)";
    };

    let primaryColor = color();
    const refreshColor = () => {
      primaryColor = color();
    };
    const themeObs = new MutationObserver(refreshColor);
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        ctx.beginPath();
        ctx.fillStyle = `color-mix(in oklab, ${primaryColor} ${Math.round(p.a * 100)}%, transparent)`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      themeObs.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-70 mix-blend-screen"
    />
  );
}

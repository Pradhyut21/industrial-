import { useEffect, useRef } from "react";

/**
 * Lightweight canvas confetti burst.
 * Listen for window CustomEvent "fx:confetti" with detail { x?: number; y?: number; color?: string }.
 *
 *   window.dispatchEvent(new CustomEvent("fx:confetti", { detail: { x: 600, y: 300 } }));
 */

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  rotation: number;
  vr: number;
  color: string;
  life: number;
  maxLife: number;
}

const COLORS = [
  "oklch(0.78 0.18 75)",   // amber
  "oklch(0.7 0.22 28)",    // red
  "oklch(0.78 0.16 145)",  // green
  "oklch(0.7 0.22 260)",   // blue
  "oklch(0.85 0.012 80)",  // ivory
];

export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const burst = (e: Event) => {
      if (reduce) return;
      const detail = (e as CustomEvent).detail || {};
      const ox = detail.x ?? window.innerWidth / 2;
      const oy = detail.y ?? window.innerHeight / 3;
      const N = 110;
      for (let i = 0; i < N; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 9;
        particlesRef.current.push({
          x: ox, y: oy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          size: 4 + Math.random() * 5,
          rotation: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          color: detail.color || COLORS[Math.floor(Math.random() * COLORS.length)],
          life: 0,
          maxLife: 70 + Math.random() * 50,
        });
      }
      if (!rafRef.current) loop();
    };
    window.addEventListener("fx:confetti", burst as EventListener);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const arr = particlesRef.current;
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.vy += 0.22; // gravity
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        p.life++;
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.4);
        ctx.restore();
        if (p.life >= p.maxLife || p.y > window.innerHeight + 40) {
          arr.splice(i, 1);
        }
      }
      if (arr.length > 0) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        rafRef.current = 0;
      }
    };

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("fx:confetti", burst as EventListener);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[90]"
    />
  );
}

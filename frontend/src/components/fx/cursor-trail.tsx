import { useEffect, useRef } from "react";

/**
 * Aurora cursor trail: a soft, color-shifted blob that follows the pointer.
 * GPU-only transforms, disabled on touch + reduced-motion.
 */
export function CursorTrail() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let rx = x;
    let ry = y;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${x - 4}px, ${y - 4}px, 0)`;
      }
    };

    const tick = () => {
      rx += (x - rx) * 0.12;
      ry += (y - ry) * 0.12;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${rx - 140}px, ${ry - 140}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[1] h-[280px] w-[280px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, oklch(from var(--color-primary) l c h / 0.18) 0%, transparent 60%)",
          filter: "blur(20px)",
          mixBlendMode: "screen",
          willChange: "transform",
        }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[60] h-2 w-2 rounded-full"
        style={{
          background: "var(--color-primary)",
          boxShadow: "0 0 12px var(--color-primary)",
          willChange: "transform",
        }}
      />
    </>
  );
}

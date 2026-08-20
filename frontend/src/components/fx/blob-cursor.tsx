import { useEffect, useRef } from "react";

/**
 * Liquid blob follower — gooey SVG circles lagging the cursor.
 * Disabled on touch + reduced motion.
 */
export function BlobCursor() {
  const aRef = useRef<SVGCircleElement | null>(null);
  const bRef = useRef<SVGCircleElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tx = 0, ty = 0;
    let ax = 0, ay = 0;
    let bx = 0, by = 0;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    const tick = () => {
      ax += (tx - ax) * 0.14;
      ay += (ty - ay) * 0.14;
      bx += (tx - bx) * 0.08;
      by += (ty - by) * 0.08;
      if (aRef.current) {
        aRef.current.setAttribute("cx", String(ax));
        aRef.current.setAttribute("cy", String(ay));
      }
      if (bRef.current) {
        bRef.current.setAttribute("cx", String(bx));
        bRef.current.setAttribute("cy", String(by));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[55] h-full w-full"
      style={{ filter: "url(#blobGoo)", mixBlendMode: "screen" }}
    >
      <defs>
        <filter id="blobGoo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"
          />
        </filter>
      </defs>
      <circle
        ref={aRef}
        r="14"
        fill="color-mix(in oklab, var(--primary) 70%, transparent)"
      />
      <circle
        ref={bRef}
        r="10"
        fill="color-mix(in oklab, var(--accent) 60%, transparent)"
      />
    </svg>
  );
}

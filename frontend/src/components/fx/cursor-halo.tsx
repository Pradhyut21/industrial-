import { useEffect, useRef } from "react";

/**
 * Magnetic cursor halo. A ring follows the pointer with easing and
 * snaps/grows over elements tagged with [data-cursor-snap] or interactive
 * elements (a, button, [role=button]). Disabled on touch + reduced-motion.
 */
export function CursorHalo() {
  const ringRef = useRef<HTMLDivElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ring = ringRef.current!;
    const dot = dotRef.current!;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let rx = tx;
    let ry = ty;
    let raf = 0;
    let snapped = false;
    let snapRect: DOMRect | null = null;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      dot.style.transform = `translate3d(${tx}px, ${ty}px, 0) translate(-50%, -50%)`;
      const el = (e.target as HTMLElement)?.closest(
        "[data-cursor-snap], a, button, [role='button'], input, textarea, select",
      ) as HTMLElement | null;
      if (el) {
        snapped = true;
        snapRect = el.getBoundingClientRect();
        ring.classList.add("cursor-halo--snap");
      } else {
        snapped = false;
        snapRect = null;
        ring.classList.remove("cursor-halo--snap");
      }
    };

    const tick = () => {
      if (snapped && snapRect) {
        const cx = snapRect.left + snapRect.width / 2;
        const cy = snapRect.top + snapRect.height / 2;
        rx += (cx - rx) * 0.22;
        ry += (cy - ry) * 0.22;
        ring.style.width = `${snapRect.width + 12}px`;
        ring.style.height = `${snapRect.height + 12}px`;
        ring.style.borderRadius =
          getComputedStyle(document.documentElement).getPropertyValue("--radius") || "10px";
      } else {
        rx += (tx - rx) * 0.18;
        ry += (ty - ry) * 0.18;
        ring.style.width = "36px";
        ring.style.height = "36px";
        ring.style.borderRadius = "999px";
      }
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
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
    <>
      <div ref={ringRef} aria-hidden className="cursor-halo" />
      <div ref={dotRef} aria-hidden className="cursor-halo-dot" />
    </>
  );
}

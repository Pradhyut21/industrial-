import { useEffect } from "react";

/**
 * Auto-attaches a subtle 3D tilt + parallax sheen to every .glass-card.
 * Re-scans on route changes via MutationObserver.
 */
export function CardTilt() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const MAX = 6; // deg
    const attached = new WeakSet<HTMLElement>();

    const onEnter = (el: HTMLElement) => {
      el.style.transformStyle = "preserve-3d";
      el.style.willChange = "transform";
    };

    const onMove = (el: HTMLElement, e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rx = (0.5 - py) * MAX;
      const ry = (px - 0.5) * MAX;
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
      el.style.setProperty("--mx", `${px * 100}%`);
      el.style.setProperty("--my", `${py * 100}%`);
    };

    const onLeave = (el: HTMLElement) => {
      el.style.transform = "";
    };

    const attach = (el: HTMLElement) => {
      if (attached.has(el)) return;
      attached.add(el);
      const enter = () => onEnter(el);
      const move = (e: PointerEvent) => onMove(el, e);
      const leave = () => onLeave(el);
      el.addEventListener("pointerenter", enter);
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
    };

    const scan = () => {
      document.querySelectorAll<HTMLElement>(".glass-card").forEach(attach);
    };

    scan();
    const obs = new MutationObserver(() => scan());
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  return null;
}

import { useEffect } from "react";

/**
 * Global click ripple — emits a brief concentric ring from the click point.
 * Listens on document, ignores text-input targets, respects reduced motion.
 */
export function ClickRipple() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;

      const r = document.createElement("span");
      r.setAttribute("aria-hidden", "true");
      r.style.cssText = `
        position: fixed;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        width: 8px; height: 8px;
        border-radius: 9999px;
        border: 2px solid oklch(from var(--color-primary) l c h / 0.7);
        transform: translate(-50%, -50%) scale(1);
        pointer-events: none;
        z-index: 9999;
        opacity: 0.9;
        animation: clickRipple 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        mix-blend-mode: screen;
      `;
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 650);
    };

    document.addEventListener("click", onClick, { passive: true });
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}

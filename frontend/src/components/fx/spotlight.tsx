import { useEffect } from "react";

/**
 * Global cursor spotlight: tracks pointer and writes --mx/--my CSS vars
 * on any .glass-card under the cursor. Combined with the CSS rule in
 * styles.css, this paints a soft following highlight on every card.
 */
export function SpotlightTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const handler = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      const card = target.closest<HTMLElement>(".glass-card");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--mx", `${x}%`);
      card.style.setProperty("--my", `${y}%`);
    };

    window.addEventListener("pointermove", handler, { passive: true });
    return () => window.removeEventListener("pointermove", handler);
  }, []);

  return null;
}

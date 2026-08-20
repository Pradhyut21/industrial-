import { useEffect, useState } from "react";

/** Top-edge scroll progress bar synced to window scrollY. */
export function ScrollProgress() {
  const [p, setP] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60] h-[2px] w-full"
    >
      <div
        className="h-full origin-left transition-[width] duration-150 ease-out"
        style={{
          width: `${p}%`,
          background:
            "linear-gradient(90deg, transparent, var(--primary), var(--accent), var(--primary), transparent)",
          boxShadow: "0 0 12px color-mix(in oklab, var(--primary) 60%, transparent)",
        }}
      />
    </div>
  );
}

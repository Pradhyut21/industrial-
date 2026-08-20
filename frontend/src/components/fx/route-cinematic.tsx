import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Cinematic route transition overlay:
 *  - top progress bar synced to router loading state
 *  - scanline wipe across the viewport on every navigation
 *  - corner crosshair brackets that snap in/out
 *  - radial flash + film grain pulse
 *
 * Mount once near the top of the app (inside SidebarProvider is fine).
 */
export function RouteCinematic() {
  const status = useRouterState({ select: (s) => s.status }); // "idle" | "pending"
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);


  // Drive a fake-but-believable progress bar tied to router status
  useEffect(() => {
    let raf = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    if (status === "pending") {
      window.dispatchEvent(new CustomEvent("fx:route"));
      setShowProgress(true);
      setProgress(8);
      const tick = () => {
        setProgress((p) => {
          const target = 92;
          const next = p + (target - p) * 0.05;
          return next > target ? target : next;
        });
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } else {
      setProgress(100);
      timeout = setTimeout(() => {
        setShowProgress(false);
        setProgress(0);
      }, 320);
    }
    return () => {
      cancelAnimationFrame(raf);
      if (timeout) clearTimeout(timeout);
    };
  }, [status]);

  return (
    <>
      {/* Top progress bar */}
      <div
        aria-hidden
        className="pointer-events-none fixed left-0 right-0 top-0 z-[80] h-[2px]"
        style={{ opacity: showProgress ? 1 : 0, transition: "opacity 200ms" }}
      >
        <div
          className="h-full origin-left"
          style={{
            width: `${progress}%`,
            background:
              "linear-gradient(90deg, transparent, var(--color-primary) 30%, oklch(from var(--color-primary) calc(l + 0.15) c h) 60%, var(--color-primary) 80%, transparent)",
            boxShadow:
              "0 0 12px var(--color-primary), 0 0 24px oklch(from var(--color-primary) l c h / 0.4)",
            transition: "width 160ms cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        />
      </div>

    </>
  );
}

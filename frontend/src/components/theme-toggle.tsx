import { useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

// View Transitions API type (not yet in all TS lib targets)
type DocumentWithVT = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> };
};

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const btnRef = useRef<HTMLButtonElement>(null);

  const handle = () => {
    const doc = document as DocumentWithVT;
    if (!doc.startViewTransition || !btnRef.current) {
      toggle();
      return;
    }
    const rect = btnRef.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    document.documentElement.style.setProperty("--vt-x", `${x}px`);
    document.documentElement.style.setProperty("--vt-y", `${y}px`);
    document.documentElement.style.setProperty("--vt-r", `${endRadius}px`);
    const transition = doc.startViewTransition(() => {
      toggle();
    });
    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0 at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 600,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={handle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="inline-flex items-center gap-2 h-8 px-3 border border-border rounded-md bg-card hover:bg-accent/10 hover:scale-105 transition-all cursor-pointer"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-primary" />
      ) : (
        <Moon className="h-4 w-4 text-primary" />
      )}
      <span className="font-display uppercase tracking-widest text-[0.65rem] text-muted-foreground">
        {theme === "dark" ? "Light" : "Dark"}
      </span>
    </button>
  );
}

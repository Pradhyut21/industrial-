import { useEffect, useState } from "react";
import { X } from "lucide-react";

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["⌘", "K"], label: "Open command palette" },
  { keys: ["?"], label: "Toggle this shortcuts overlay" },
  { keys: ["G", "M"], label: "Go to Plant Map" },
  { keys: ["G", "C"], label: "Go to Copilot" },
  { keys: ["G", "A"], label: "Go to Audit" },
  { keys: ["G", "I"], label: "Go to Ingestion" },
  { keys: ["T"], label: "Toggle theme" },
  { keys: ["Esc"], label: "Close any open overlay" },
];

/** Press '?' anywhere to toggle. */
export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (e.key === "Escape") return setOpen(false);
      if (!inField && e.key === "?") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/70 backdrop-blur-md animate-fade-in"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card max-w-md w-[90%] p-6 animate-scale-in"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display uppercase tracking-[0.2em] text-sm text-primary">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close shortcuts"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 rounded-md border border-border bg-card/80 shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground text-center">
          Press <kbd className="font-mono px-1">?</kbd> any time to reopen
        </p>
      </div>
    </div>
  );
}

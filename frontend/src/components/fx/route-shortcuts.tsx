import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme-context";

const MAP: Record<string, { to: string; label: string }> = {
  m: { to: "/", label: "Plant Map" },
  o: { to: "/office", label: "Office Simulation" },
  a: { to: "/audit", label: "Project & Operations Hub" },
  v: { to: "/vault", label: "AI Standup & Dev Hub" },
};

/** Vim-style 'g <key>' to jump between views, 't' to toggle theme. */
export function RouteShortcuts() {
  const navigate = useNavigate();
  const theme = useTheme();
  const pendingG = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (inField || e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key.toLowerCase();
      if (pendingG.current && MAP[k]) {
        e.preventDefault();
        pendingG.current = false;
        if (timer.current) clearTimeout(timer.current);
        const dest = MAP[k];
        navigate({ to: dest.to });
        toast(`→ ${dest.label}`);
        return;
      }
      if (k === "g") {
        pendingG.current = true;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => { pendingG.current = false; }, 900);
        return;
      }
      if (k === "t") {
        e.preventDefault();
        theme.toggle();
        toast(`Theme: ${theme.theme === "dark" ? "light" : "dark"}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [navigate, theme]);

  return null;
}

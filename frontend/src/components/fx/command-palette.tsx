import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import { Activity, MessageSquare, ShieldCheck, Archive, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

const ROUTES: Array<{
  label: string;
  hint: string;
  to: string;
  icon: typeof Activity;
}> = [
  { label: "Plant Map", hint: "CFO · Telemetry & financial risk twin", to: "/", icon: Activity },
  { label: "Operations Floor", hint: "Simulation · 2D multi-agent control room", to: "/office", icon: MessageSquare },
  { label: "Field Copilot", hint: "Field Tech · Multi-expert consultation & citations", to: "/copilot", icon: MessageSquare },
  { label: "SOP Audit & Freshness", hint: "Ops Lead · Shadow SOP audit & decay matrix", to: "/audit", icon: ShieldCheck },
  { label: "Continuity Vault", hint: "Vault Custodian · Cognitive capsules & handoff briefs", to: "/vault", icon: Archive },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-start justify-center p-4 pt-[18vh] animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="absolute inset-0 bg-background/60 backdrop-blur-md"
        aria-hidden
      />
      <div
        className="relative w-full max-w-xl glass-card animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command palette" className="w-full">
          <Command.Input
            autoFocus
            placeholder="Search engineers, equipment, or jump to a view…"
            className="w-full bg-transparent px-5 py-4 font-sans text-base text-foreground placeholder:text-muted-foreground outline-none border-b border-border"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-4 py-6 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
              No matches
            </Command.Empty>
            <Command.Group
              heading="Navigate"
              className="px-2 pt-2 text-[10px] font-display uppercase tracking-[0.2em] text-muted-foreground"
            >
              {ROUTES.map((r) => (
                <Command.Item
                  key={r.to}
                  value={`${r.label} ${r.hint}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate({ to: r.to });
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground data-[selected=true]:bg-primary/15 data-[selected=true]:text-foreground"
                >
                  <r.icon className="h-4 w-4 text-primary" />
                  <span className="flex-1">{r.label}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {r.hint}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group
              heading="Theme"
              className="px-2 pt-3 text-[10px] font-display uppercase tracking-[0.2em] text-muted-foreground"
            >
              <Command.Item
                value="toggle theme dark light"
                onSelect={() => {
                  setTheme(theme === "dark" ? "light" : "dark");
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground data-[selected=true]:bg-primary/15"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-primary" />
                ) : (
                  <Moon className="h-4 w-4 text-primary" />
                )}
                <span>Switch to {theme === "dark" ? "light" : "dark"} mode</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <span>↵ select · ↑↓ navigate</span>
            <span>ESC close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

const FEED = [
  "TURBINE-04 vibration nominal",
  "EXPERT R. NAYAR · 14 mo to retirement",
  "BOILER-2 SOP coverage 62%",
  "COGNITIVE DECAY MODEL · re-ran @ 12:04",
  "INGEST QUEUE · 3 voice notes pending",
  "SHADOW SOP detected · NIGHT SHIFT",
  "COMPLIANCE INDEX · 0.84 ↑",
  "KNOWLEDGE FRESHNESS · 73%",
];

/**
 * Live status ticker — a marquee strip of fake-but-believable plant events,
 * plus the current pathname. Pure CSS animation, GPU-only.
 */
export function StatusTicker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [now, setNow] = useState("");

  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(id);
  }, []);

  const items = [`PATH ${pathname}`, `T ${now}`, ...FEED];
  const loop = [...items, ...items];

  return (
    <div className="relative h-6 overflow-hidden border-y border-border bg-card/60 backdrop-blur-sm">
      <div
        className="absolute inset-y-0 flex items-center gap-8 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
        style={{
          animation: "tickerScroll 60s linear infinite",
          willChange: "transform",
        }}
      >
        {loop.map((t, i) => (
          <span key={i} className="flex items-center gap-3">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

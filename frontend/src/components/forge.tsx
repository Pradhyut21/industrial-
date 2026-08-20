import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Odometer } from "@/components/fx/odometer";
import { Sparkline } from "@/components/fx/sparkline";
import { SplitText } from "@/components/fx/split-text";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="px-6 pt-6 pb-4 border-b border-border flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="section-label">{eyebrow}</div>
        <SplitText
          as="h1"
          text={title}
          className="font-display text-3xl md:text-4xl font-bold text-foreground mt-1 block"
          stagger={22}
        />
        {description && (
          <p className="text-muted-foreground text-sm mt-2 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ForgePanel({
  children,
  className,
  glow,
}: {
  children: ReactNode;
  className?: string;
  glow?: "gold" | "steel" | "fire";
}) {
  const glowClass =
    glow === "gold" ? "gold-glow" : glow === "steel" ? "steel-glow" : glow === "fire" ? "fire-glow" : "";
  return (
    <div
      className={cn(
        "relative bg-card border border-border rounded-sm scanlines",
        glowClass,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Tag({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "fire" | "steel" | "muted" }) {
  const map = {
    gold: "border-primary/40 text-primary bg-primary/10",
    fire: "border-destructive/40 text-destructive bg-destructive/10",
    steel: "border-accent/40 text-accent bg-accent/10",
    muted: "border-border text-muted-foreground bg-muted/30",
  } as const;
  return (
    <span
      className={cn(
        "font-mono text-[0.7rem] uppercase tracking-widest px-2 py-0.5 border rounded-sm whitespace-nowrap",
        map[tone],
      )}
    >
      {children}
    </span>
  );
}

export function EquipmentTag({ tag }: { tag: string }) {
  return <span className="equipment-tag">{tag}</span>;
}

export function Stat({
  label,
  value,
  numeric,
  prefix = "",
  suffix = "",
  decimals = 0,
  hint,
  tone = "default",
  sparkline,
  delta,
}: {
  label: string;
  /** Static fallback when numeric isn't supplied. */
  value?: ReactNode;
  /** When provided, animates from previous render via Odometer. */
  numeric?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  hint?: string;
  tone?: "default" | "fire" | "steel" | "gold";
  /** Optional inline trend line. */
  sparkline?: number[];
  /** Optional percentage delta to render with an arrow chip. */
  delta?: number;
}) {
  const toneClass =
    tone === "fire"
      ? "text-destructive"
      : tone === "steel"
      ? "text-accent"
      : tone === "gold"
      ? "text-primary"
      : "text-foreground";
  const sparkColor =
    tone === "fire"
      ? "oklch(0.65 0.24 28)"
      : tone === "steel"
      ? "oklch(0.7 0.12 220)"
      : "oklch(0.85 0.16 80)";
  const deltaUp = (delta ?? 0) >= 0;
  return (
    <div className="glass-card p-5 group relative overflow-hidden">
      <div className="section-label flex items-center justify-between">
        <span>{label}</span>
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-breathe" />
      </div>
      <div className="flex items-end justify-between gap-3 mt-2">
        <div
          className={cn(
            "font-counter text-3xl md:text-4xl tabular-nums tracking-tight transition-transform duration-300 group-hover:scale-[1.04] origin-left",
            toneClass,
          )}
        >
          {numeric !== undefined ? (
            <Odometer value={numeric} prefix={prefix} suffix={suffix} decimals={decimals} />
          ) : (
            value
          )}
        </div>
        {sparkline && sparkline.length > 1 && (
          <Sparkline data={sparkline} stroke={sparkColor} className={toneClass} />
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        {delta !== undefined && (
          <span
            className={cn(
              "font-mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border ml-auto",
              deltaUp
                ? "border-destructive/40 text-destructive bg-destructive/10"
                : "border-primary/40 text-primary bg-primary/10",
            )}
          >
            {deltaUp ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}

export function ErrorBlock({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="glass-card card-accent-danger p-6 m-6 animate-fade-in-up">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-destructive animate-breathe" />
        <div className="section-label text-destructive">Service temporarily unavailable</div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        The live DeadMind cognitive server is currently offline or unreachable. The system has automatically fallback to the local high-fidelity cognitive simulation engine to ensure full operation.
      </p>
      <pre className="mt-3 text-xs font-mono text-destructive/80 whitespace-pre-wrap">{msg}</pre>
    </div>
  );
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="p-6 space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="inline-block h-2 w-2 rounded-full bg-primary animate-breathe" />
        <span className="font-mono uppercase tracking-wider text-xs">{label}</span>
      </div>
      <div className="h-3 w-1/2 rounded-md shimmer" />
      <div className="h-3 w-2/3 rounded-md shimmer" />
      <div className="h-3 w-1/3 rounded-md shimmer" />
    </div>
  );
}

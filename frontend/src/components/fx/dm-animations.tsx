/**
 * DeadMind micro-animation React helpers.
 * Wrappers that attach data-dm-* animation attributes without
 * requiring direct CSS class manipulation.
 *
 * - <SparkleEffect>   — 4-star burst when something completes
 * - <DustEffect>      — 3-dot arc when something arrives / ingests
 * - <ThinkingDots>    — 3-dot cycling "thinking" overlay
 * - <FlagPulse>       — Scale-pulsing badge for stale/review items
 * - <StatusDot>       — Live/departed/notice dot indicator
 * - <SnapIn>          — Wrapper that applies snap-in entrance animation
 */

import { useEffect, useState, type ReactNode } from "react";

// ── SparkleEffect ─────────────────────────────────────────────────────────
// Trigger: set `active` to true when a mutation completes.
// Renders 4 star particles that burst outward and fade.
export function SparkleEffect({ active, onDone }: { active: boolean; onDone?: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (active) {
      setShow(true);
      const t = setTimeout(() => {
        setShow(false);
        onDone?.();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [active, onDone]);

  if (!show) return null;

  return (
    <span className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      <span className="dm-sparkle" />
      <span className="dm-sparkle" />
      <span className="dm-sparkle" />
      <span className="dm-sparkle" />
    </span>
  );
}

// ── DustEffect ────────────────────────────────────────────────────────────
// Trigger: set `active` to true when an upload/ingest completes.
export function DustEffect({ active, onDone }: { active: boolean; onDone?: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (active) {
      setShow(true);
      const t = setTimeout(() => {
        setShow(false);
        onDone?.();
      }, 450);
      return () => clearTimeout(t);
    }
  }, [active, onDone]);

  if (!show) return null;

  return (
    <span className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      <span className="dm-dust" style={{ left: "50%", bottom: "0" }} />
      <span className="dm-dust" style={{ left: "50%", bottom: "0" }} />
      <span className="dm-dust" style={{ left: "50%", bottom: "0" }} />
    </span>
  );
}

// ── ThinkingDots ──────────────────────────────────────────────────────────
// Use as a loading indicator inline with text.
export function ThinkingDots({ color = "bg-primary" }: { color?: string }) {
  return (
    <span className="dm-thinking-dots" aria-label="Processing">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />
    </span>
  );
}

// ── FlagPulse ─────────────────────────────────────────────────────────────
// Wraps children in a pulsing badge animation (stale/review items).
export function FlagPulse({ children, active = true }: { children: ReactNode; active?: boolean }) {
  return (
    <span className={active ? "dm-flag-pulse inline-flex" : "inline-flex"}>
      {children}
    </span>
  );
}

// ── StatusDot ─────────────────────────────────────────────────────────────
// status: "active" | "departed" | "notice_period"
export function StatusDot({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "dm-status-dot dm-status-dot--active"
      : status === "notice_period"
        ? "dm-status-dot dm-status-dot--notice"
        : "dm-status-dot dm-status-dot--departed";

  return <span className={cls} aria-label={`Status: ${status}`} />;
}

// ── SnapIn ────────────────────────────────────────────────────────────────
// Wrapper: children slide in from below with the 200ms cubic-bezier.
export function SnapIn({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`dm-snap-in ${className}`}>{children}</div>;
}

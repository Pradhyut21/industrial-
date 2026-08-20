import { useEffect, useMemo, useRef, useState } from "react";
import type { NetworkRow } from "@/lib/api";

interface Node {
  id: string;
  r: number;
  x: number; y: number;
  vx: number; vy: number;
  centrality: number;
}

interface Edge { a: string; b: string; }

interface Props {
  data: NetworkRow[];
  width?: number;
  height?: number;
  onSelect?: (id: string) => void;
}

/**
 * Tiny force-directed graph — verlet-style simulation in requestAnimationFrame.
 * No external deps. Edges are derived from shared dependency tokens between rows.
 */
export function ForceGraph({ data, width = 560, height = 340, onSelect }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = data.map((r, i) => ({
      id: r.engineer,
      r: 12 + r.centrality * 18,
      centrality: r.centrality,
      x: width / 2 + Math.cos((i / data.length) * Math.PI * 2) * 120,
      y: height / 2 + Math.sin((i / data.length) * Math.PI * 2) * 90,
      vx: 0, vy: 0,
    }));
    // Edge if two engineers share at least one dependency token.
    const tokens = data.map((r) => new Set(r.dependencies.split(";").map((s) => s.trim().toLowerCase())));
    const es: Edge[] = [];
    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        let shared = 0;
        tokens[i].forEach((t) => { if (tokens[j].has(t)) shared++; });
        if (shared > 0) es.push({ a: data[i].engineer, b: data[j].engineer });
      }
    }
    return { nodes: ns, edges: es };
  }, [data, width, height]);

  const stateRef = useRef({ nodes, edges, width, height });
  stateRef.current = { nodes, edges, width, height };

  useEffect(() => {
    let raf = 0;
    const step = () => {
      const { nodes: ns, edges: es, width: W, height: H } = stateRef.current;
      const cx = W / 2, cy = H / 2;
      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const a = ns[i], b = ns[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) { d2 = 1; dx = 0.5; dy = 0.5; }
          const f = 2400 / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f, fy = (dy / d) * f;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }
      // Spring attraction along edges
      for (const e of es) {
        const a = ns.find((n) => n.id === e.a);
        const b = ns.find((n) => n.id === e.b);
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.max(0.01, Math.hypot(dx, dy));
        const target = 110;
        const f = (d - target) * 0.012;
        a.vx += (dx / d) * f; a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
      }
      // Centering + damping + integration
      for (const n of ns) {
        n.vx += (cx - n.x) * 0.002;
        n.vy += (cy - n.y) * 0.002;
        n.vx *= 0.82; n.vy *= 0.82;
        n.x += n.vx; n.y += n.vy;
        // Clamp
        const pad = n.r + 6;
        if (n.x < pad) n.x = pad;
        if (n.x > W - pad) n.x = W - pad;
        if (n.y < pad) n.y = pad;
        if (n.y > H - pad) n.y = H - pad;
      }
      setTick((t) => (t + 1) % 1_000_000);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto select-none"
      role="img"
      aria-label="Knowledge dependency graph"
    >
      <defs>
        <radialGradient id="fg-node" cx="0.35" cy="0.3">
          <stop offset="0%" stopColor="oklch(0.92 0.15 80)" stopOpacity="1" />
          <stop offset="100%" stopColor="oklch(0.72 0.18 60)" stopOpacity="0.95" />
        </radialGradient>
        <radialGradient id="fg-node-hot" cx="0.35" cy="0.3">
          <stop offset="0%" stopColor="oklch(0.85 0.22 28)" stopOpacity="1" />
          <stop offset="100%" stopColor="oklch(0.55 0.24 28)" stopOpacity="0.95" />
        </radialGradient>
        <filter id="fg-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {edges.map((e, i) => {
        const a = nodes.find((n) => n.id === e.a);
        const b = nodes.find((n) => n.id === e.b);
        if (!a || !b) return null;
        const active = hover && (hover === e.a || hover === e.b);
        const pathId = `fg-edge-${i}`;
        const d = `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
        const dur = 2.4 + (i % 5) * 0.4;
        return (
          <g key={i}>
            <path id={pathId} d={d} fill="none"
              stroke={active ? "oklch(0.85 0.18 60)" : "oklch(0.6 0.05 80 / 0.35)"}
              strokeWidth={active ? 1.6 : 1}
              strokeDasharray={active ? undefined : "4 4"}
            />
            {/* Traveling data packet */}
            <circle r={active ? 2.6 : 1.8}
              fill={active ? "oklch(0.92 0.18 75)" : "oklch(0.8 0.14 75 / 0.85)"}
              opacity={0.9}
            >
              <animateMotion dur={`${dur}s`} repeatCount="indefinite" rotate="auto">
                <mpath href={`#${pathId}`} />
              </animateMotion>
            </circle>
          </g>
        );
      })}


      {nodes.map((n) => {
        const isHot = n.centrality >= 0.8;
        const isHover = hover === n.id;
        return (
          <g
            key={n.id}
            transform={`translate(${n.x.toFixed(2)},${n.y.toFixed(2)})`}
            onMouseEnter={() => setHover(n.id)}
            onMouseLeave={() => setHover((h) => (h === n.id ? null : h))}
            onClick={() => onSelect?.(n.id)}
            style={{ cursor: onSelect ? "pointer" : "default" }}
          >
            <circle r={n.r + 8} fill={isHot ? "oklch(0.65 0.24 28)" : "oklch(0.8 0.14 85)"} opacity={isHover ? 0.25 : 0.12} />
            {isHot && (
              <circle r={n.r + 4} fill="none"
                stroke="oklch(0.85 0.22 28 / 0.7)" strokeWidth={1.2}
              >
                <animate attributeName="r" values={`${n.r + 4};${n.r + 16};${n.r + 4}`} dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0;0.8" dur="1.8s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              r={n.r}
              fill={isHot ? "url(#fg-node-hot)" : "url(#fg-node)"}
              stroke={isHot ? "oklch(0.85 0.22 28)" : "oklch(0.92 0.012 80)"}
              strokeWidth={1.4}
              filter={isHover ? "url(#fg-glow)" : undefined}
            />

            <text
              y={4}
              textAnchor="middle"
              fontFamily="Space Mono, monospace"
              fontSize={10}
              fontWeight={700}
              fill="oklch(0.15 0.01 80)"
            >
              {n.id.split(" ").map((p) => p[0]).join("")}
            </text>
            <text
              y={n.r + 14}
              textAnchor="middle"
              fontFamily="Space Grotesk, sans-serif"
              fontSize={10}
              fill="oklch(0.78 0.02 80)"
              opacity={isHover ? 1 : 0.65}
            >
              {n.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

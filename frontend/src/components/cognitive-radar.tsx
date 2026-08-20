interface Props {
  scores: {
    systematic: number;
    intuitive: number;
    mechanical: number;
    electrical: number;
    instrumentation: number;
    process: number;
  };
  size?: number;
}

const AXES = [
  "Systematic",
  "Intuitive",
  "Mechanical",
  "Electrical",
  "Instrumentation",
  "Process",
];

export function CognitiveRadar({ scores, size = 320 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 40;
  const values = [
    scores.systematic,
    scores.intuitive,
    scores.mechanical,
    scores.electrical,
    scores.instrumentation,
    scores.process,
  ];

  const angle = (i: number) => (Math.PI / 3) * i - Math.PI / 2;
  const pt = (i: number, v: number) => {
    const ratio = Math.max(0, Math.min(100, v)) / 100;
    return {
      x: cx + r * ratio * Math.cos(angle(i)),
      y: cy + r * ratio * Math.sin(angle(i)),
    };
  };
  const axisEnd = (i: number) => ({
    x: cx + r * Math.cos(angle(i)),
    y: cy + r * Math.sin(angle(i)),
  });
  const labelPos = (i: number) => ({
    x: cx + (r + 22) * Math.cos(angle(i)),
    y: cy + (r + 22) * Math.sin(angle(i)),
  });

  const poly = values.map((v, i) => {
    const p = pt(i, v);
    return `${p.x},${p.y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-md">
      {/* Concentric hex rings */}
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon
          key={k}
          points={Array.from({ length: 6 }, (_, i) => {
            const x = cx + r * k * Math.cos(angle(i));
            const y = cy + r * k * Math.sin(angle(i));
            return `${x},${y}`;
          }).join(" ")}
          fill="none"
          stroke="oklch(0.22 0.012 275)"
          strokeWidth={1}
        />
      ))}
      {/* Axes */}
      {AXES.map((_, i) => {
        const e = axisEnd(i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={e.x}
            y2={e.y}
            stroke="oklch(0.22 0.012 275)"
            strokeWidth={1}
          />
        );
      })}
      {/* Value polygon */}
      <polygon
        points={poly}
        fill="oklch(0.80 0.14 85 / 0.25)"
        stroke="oklch(0.80 0.14 85)"
        strokeWidth={2}
        style={{ filter: "drop-shadow(0 0 8px oklch(0.80 0.14 85 / 0.5))" }}
      />
      {/* Value dots */}
      {values.map((v, i) => {
        const p = pt(i, v);
        return <circle key={i} cx={p.x} cy={p.y} r={3} fill="oklch(0.90 0.16 180)" />;
      })}
      {/* Labels */}
      {AXES.map((label, i) => {
        const l = labelPos(i);
        return (
          <text
            key={label}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="Rajdhani, sans-serif"
            fontSize={11}
            letterSpacing={1.5}
            fill="oklch(0.59 0.025 80)"
            style={{ textTransform: "uppercase" }}
          >
            {label}
          </text>
        );
      })}
      {/* Value numbers near each axis */}
      {values.map((v, i) => {
        const p = pt(i, v);
        return (
          <text
            key={`v${i}`}
            x={p.x}
            y={p.y - 8}
            textAnchor="middle"
            fontFamily="Orbitron, monospace"
            fontSize={10}
            fontWeight={700}
            fill="oklch(0.80 0.14 85)"
          >
            {v}
          </text>
        );
      })}
    </svg>
  );
}

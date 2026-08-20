interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  stroke?: string;
}

/** Lightweight inline sparkline — no deps, draws a smooth area + line. */
export function Sparkline({
  data,
  width = 120,
  height = 32,
  className,
  stroke = "currentColor",
}: SparklineProps) {
  if (data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const pts = data.map((d, i) => {
    const x = i * step;
    const y = height - ((d - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });
  const path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkFill)" />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={stroke}>
        <animate attributeName="r" values="2;3.5;2" dur="1.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

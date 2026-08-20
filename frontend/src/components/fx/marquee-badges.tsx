/** Decorative scrolling word strip used to add motion to dense pages. */
export function MarqueeBadges({
  items,
  speed = 30,
}: {
  items: string[];
  speed?: number;
}) {
  const doubled = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y border-border/60 bg-card/40">
      <div
        className="flex gap-10 whitespace-nowrap py-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
        style={{
          animation: `tickerScroll ${speed}s linear infinite`,
          width: "max-content",
        }}
      >
        {doubled.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-3">
            <span className="inline-block h-1 w-1 rounded-full bg-primary" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

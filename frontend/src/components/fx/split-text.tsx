interface SplitTextProps {
  text: string;
  className?: string;
  letterClassName?: string;
  delay?: number;     // ms before first letter
  stagger?: number;   // ms between letters
  as?: "span" | "h1" | "h2" | "h3" | "p";
}

/**
 * SplitText — renders each character with a staggered fade+rise animation.
 * Uses CSS keyframe `fadeInUp` defined globally. Whitespace preserved.
 */
export function SplitText({
  text,
  className,
  letterClassName,
  delay = 0,
  stagger = 28,
  as: Tag = "span",
}: SplitTextProps) {
  const chars = Array.from(text);
  return (
    <Tag className={className} aria-label={text}>
      {chars.map((ch, i) => (
        <span
          key={i}
          aria-hidden
          className={"splittext-letter " + (letterClassName ?? "")}
          style={{
            animationDelay: `${delay + i * stagger}ms`,
            whiteSpace: ch === " " ? "pre" : undefined,
          }}
        >
          {ch}
        </span>
      ))}
    </Tag>
  );
}

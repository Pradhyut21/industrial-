import { useEffect, useRef, useState } from "react";

/**
 * Typewriter — types `text` character-by-character with a blinking caret.
 * Drop-in for any heading; respects reduced motion.
 */
export function Typewriter({
  text,
  speed = 28,
  className = "",
  caret = true,
}: {
  text: string;
  speed?: number;
  className?: string;
  caret?: boolean;
}) {
  const [shown, setShown] = useState("");
  const ref = useRef(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text);
      return;
    }
    ref.current = 0;
    setShown("");
    const id = window.setInterval(() => {
      ref.current += 1;
      setShown(text.slice(0, ref.current));
      if (ref.current >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed]);

  return (
    <span className={className}>
      {shown}
      {caret && <span className="blink-cursor ml-0.5 inline-block w-[2px] -mb-1 h-[1em] bg-current align-middle" />}
    </span>
  );
}

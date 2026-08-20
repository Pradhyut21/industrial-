import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Web Audio micro-feedback. Listens for global events:
 *  - "fx:hover-tick" / actual hover via [data-sfx]
 *  - "fx:click"
 *  - "fx:route" — route change whoosh
 *  - "fx:confetti" — chime
 * Off by default; toggle via floating button (bottom-left).
 */
export function AudioFx() {
  const [on, setOn] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const lastTick = useRef(0);

  useEffect(() => {
    if (!on) return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    ctxRef.current = ctx;

    const blip = (freq: number, dur = 0.08, type: OscillatorType = "sine", gain = 0.04) => {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    };

    const chime = () => {
      [880, 1320, 1760].forEach((f, i) =>
        setTimeout(() => blip(f, 0.22, "triangle", 0.05), i * 70),
      );
    };
    const whoosh = () => {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const filt = ctx.createBiquadFilter();
      filt.type = "bandpass";
      filt.frequency.setValueAtTime(800, t);
      filt.frequency.exponentialRampToValueAtTime(180, t + 0.35);
      o.type = "sawtooth";
      o.frequency.setValueAtTime(180, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      o.connect(filt).connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.42);
    };

    const onHover = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (!el?.closest?.("button, a, [data-sfx]")) return;
      const now = performance.now();
      if (now - lastTick.current < 60) return;
      lastTick.current = now;
      blip(2200, 0.04, "square", 0.012);
    };
    const onClick = () => blip(660, 0.07, "triangle", 0.05);
    const onRoute = () => whoosh();
    const onConfetti = () => chime();

    document.addEventListener("pointerover", onHover, true);
    document.addEventListener("click", onClick, true);
    window.addEventListener("fx:route", onRoute as EventListener);
    window.addEventListener("fx:confetti", onConfetti as EventListener);

    return () => {
      document.removeEventListener("pointerover", onHover, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("fx:route", onRoute as EventListener);
      window.removeEventListener("fx:confetti", onConfetti as EventListener);
      ctx.close();
    };
  }, [on]);

  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      aria-label={on ? "Mute sound effects" : "Enable sound effects"}
      title={on ? "Mute SFX" : "Enable SFX"}
      className="fixed bottom-4 left-4 z-50 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/80 backdrop-blur-md text-muted-foreground hover:text-foreground hover:scale-110 transition-all shadow-lg"
    >
      {on ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}

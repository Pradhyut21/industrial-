import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const SEEN_KEY = "deadmind:booted";

export function BootSequence() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SEEN_KEY)) return;
    setShow(true);
    sessionStorage.setItem(SEEN_KEY, "1");
    const t = setTimeout(() => setShow(false), 1600);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="boot"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.7, 0, 0.3, 1] }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background"
        >
          {/* scanline */}
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: "100%" }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-x-0 h-px bg-primary shadow-[0_0_24px_4px_var(--color-primary)] opacity-80"
          />
          <div className="flex flex-col items-center gap-3">
            <motion.div
              initial={{ opacity: 0, letterSpacing: "0.6em" }}
              animate={{ opacity: 1, letterSpacing: "0.25em" }}
              transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
              className="font-display text-3xl sm:text-5xl uppercase text-foreground"
            >
              DeadMind
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="font-mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground"
            >
              Preserving cognition · v2.1
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "180px" }}
              transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
              className="mt-4 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

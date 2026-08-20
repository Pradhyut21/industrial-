import { AnimatePresence, motion } from "motion/react";
import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useRouterState({ select: (s) => s.location.pathname });
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={{ opacity: 0, y: 18, scale: 0.985, filter: "blur(8px)", clipPath: "inset(0 0 100% 0)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)", clipPath: "inset(0 0 0% 0)" }}
        exit={{ opacity: 0, y: -10, scale: 0.99, filter: "blur(6px)", clipPath: "inset(0 0 0% 0)" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

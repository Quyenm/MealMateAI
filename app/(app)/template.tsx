"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * App-wide page transition. `template.tsx` re-mounts on every navigation, so the
 * page content fades + slides in each time while the shell (sidebar/nav/atmosphere
 * in layout.tsx) stays put. Disabled under prefers-reduced-motion.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className="flex flex-1 flex-col">{children}</div>;
  return (
    <motion.div
      className="flex flex-1 flex-col"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

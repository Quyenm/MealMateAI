"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Two very-low-opacity blurred radial blooms (cool sky + warm peach) that make
 * cream feel lit instead of flat. `drift` (hero only) animates them slowly;
 * elsewhere they stay static so they never distract.
 */
export function Atmosphere({ drift = false }: { drift?: boolean }) {
  const reduced = useReducedMotion();
  const animate = drift && !reduced;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <motion.div
        className="absolute -left-40 -top-32 h-[30rem] w-[30rem] rounded-full bg-[#7cc6ec]/18 blur-[120px]"
        animate={animate ? { scale: [1, 1.12, 1], x: [0, 26, 0], y: [0, 18, 0] } : undefined}
        transition={animate ? { duration: 15, repeat: Infinity, ease: "easeInOut" } : undefined}
      />
      <motion.div
        className="absolute -right-32 bottom-[-8rem] h-[34rem] w-[34rem] rounded-full bg-[#fde7cf]/45 blur-[140px]"
        animate={animate ? { scale: [1, 1.1, 1], x: [0, -22, 0], y: [0, 24, 0] } : undefined}
        transition={animate ? { duration: 17, repeat: Infinity, ease: "easeInOut" } : undefined}
      />
    </div>
  );
}

/**
 * Barely-there film grain (SVG feTurbulence) that kills banding and reads as
 * expensive texture. Soft-light blended, opacity <= 6% so body text stays AA.
 */
export function Grain({ opacity = 0.05 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 mix-blend-soft-light"
      style={{
        opacity,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}

"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Circular progress that draws itself in on mount. Tuned for the white-on-blue
 * hero (white stroke). Respects reduced-motion (renders the final state instantly).
 */
export function ProgressRing({
  pct,
  size = 60,
  stroke = 6,
  className,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  const mid = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className={className}>
      <circle cx={mid} cy={mid} r={r} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth={stroke} />
      <motion.circle
        cx={mid}
        cy={mid}
        r={r}
        fill="none"
        stroke="#fff"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        transform={`rotate(-90 ${mid} ${mid})`}
        initial={{ strokeDashoffset: reduced ? offset : c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: reduced ? 0 : 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
      <text x={mid} y={mid + 4} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

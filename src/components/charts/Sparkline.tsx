"use client";
import { motion, useReducedMotion } from "motion/react";
import { dur, ease } from "@/lib/motion-tokens";

export function Sparkline({ values, width = 84, height = 28, color = "var(--color-ink)" }: { values: number[]; width?: number; height?: number; color?: string }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...values);
  const x = (i: number) => (width * i) / Math.max(1, values.length - 1);
  const y = (v: number) => height - 3 - ((height - 6) * v) / max;
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i)} ${y(v)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      <motion.path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : dur.draw, ease: ease.inOut }} />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={2.4} fill={color} />
    </svg>
  );
}

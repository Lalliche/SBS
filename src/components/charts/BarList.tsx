"use client";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion-tokens";

export interface BarRow {
  id: string;
  label: string;
  sub?: string;
  value: number; // 0..1 share
  display: string;
}

/** Horizontal bars; each fills from the baseline with scaleX (transform only). */
export function BarList({ rows, className }: { rows: BarRow[]; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <ul className={cn("flex flex-col gap-3.5", className)}>
      {rows.map((r, i) => (
        <li key={r.id}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-text">
              {r.label} {r.sub && <span className="ms-1 text-xs font-normal text-text-muted">{r.sub}</span>}
            </span>
            <span className="tabular-nums text-text-secondary">{r.display}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-paper-deep">
            <motion.div className="h-full origin-left rounded-full bg-ink" initial={{ scaleX: reduce ? r.value : 0 }} animate={{ scaleX: Math.max(0.01, r.value) }} transition={{ duration: reduce ? 0 : dur.reveal, ease: ease.outExpo, delay: i * 0.07 }} style={{ width: "100%" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

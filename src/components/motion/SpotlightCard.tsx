"use client";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useCanHover } from "@/lib/use-media";

/** Cursor-follow light + glow border. Hover-only; no-op on touch / reduced motion. */
export function SpotlightCard({ children, className, tone = "light", as = "div", onClick }: { children: ReactNode; className?: string; tone?: "light" | "dark"; as?: "div" | "article"; onClick?: () => void }) {
  const reduce = useReducedMotion();
  const canHover = useCanHover();
  const mx = useMotionValue(-1000);
  const my = useMotionValue(-1000);
  const rect = useRef<DOMRect | null>(null);
  const rgb = tone === "dark" ? "255 255 255" : "228 4 44";
  const light = useMotionTemplate`radial-gradient(18em circle at ${mx}px ${my}px, rgb(${rgb} / ${tone === "dark" ? 0.08 : 0.07}), transparent 65%)`;
  const border = useMotionTemplate`radial-gradient(12em circle at ${mx}px ${my}px, rgb(${rgb} / ${tone === "dark" ? 0.45 : 0.55}), transparent 65%)`;
  const Comp = motion[as];
  return (
    <Comp
      className={cn("group relative rounded-xl p-px", className)}
      onClick={onClick}
      onPointerEnter={(e) => {
        rect.current = e.currentTarget.getBoundingClientRect();
      }}
      onPointerMove={(e) => {
        if (reduce || !canHover || !rect.current) return;
        mx.set(e.clientX - rect.current.left);
        my.set(e.clientY - rect.current.top);
      }}
      onPointerLeave={() => {
        mx.set(-1000);
        my.set(-1000);
      }}
    >
      <span aria-hidden className={cn("absolute inset-0 rounded-[inherit]", tone === "dark" ? "bg-white/10" : "bg-border")} />
      {canHover && !reduce && <motion.span aria-hidden className="absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: border }} />}
      <span className={cn("relative block h-full rounded-[calc(var(--radius-xl)-1px)]", tone === "dark" ? "bg-ink-soft" : "bg-bg")}>
        {canHover && !reduce && <motion.span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ background: light }} />}
        {children}
      </span>
    </Comp>
  );
}

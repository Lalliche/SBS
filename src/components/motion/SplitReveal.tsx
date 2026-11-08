"use client";
import { motion, useReducedMotion } from "motion/react";
import type { ElementType } from "react";
import { lineUp, revealReduced, staggerParent, staggerStep, viewport } from "@/lib/motion-tokens";

/** Word-by-word masked reveal. `aria-label` holds the full string; pieces are aria-hidden. */
export function SplitReveal({ text, as = "h2", className, immediate = false, emphasis = [], id }: { id?: string; text: string; as?: "h1" | "h2" | "h3" | "p"; className?: string; immediate?: boolean; emphasis?: string[] }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  const M = motion[as] as ElementType;
  const trigger = immediate ? { animate: "visible" } : { whileInView: "visible", viewport };
  return (
    <M id={id} aria-label={text} className={className} variants={staggerParent(staggerStep.words, immediate ? 0.15 : 0)} initial="hidden" {...trigger}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span className={`inline-block ${emphasis.includes(w.replace(/[.,]/g, "")) ? "italic" : ""}`} variants={reduce ? revealReduced : lineUp}>
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </M>
  );
}

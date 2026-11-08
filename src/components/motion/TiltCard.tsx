"use client";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { ReactNode } from "react";
import { follow } from "@/lib/motion-tokens";
import { useCanHover } from "@/lib/use-media";
import { cn } from "@/lib/utils";

/** CSS-3D tilt with springs + moving sheen. Pointer-driven only on hover-capable devices. */
export function TiltCard({ children, className, maxTilt = 8 }: { children: ReactNode; className?: string; maxTilt?: number }) {
  const reduce = useReducedMotion();
  const canHover = useCanHover();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [maxTilt, -maxTilt]), follow.tilt);
  const rotateY = useSpring(useTransform(px, [0, 1], [-maxTilt, maxTilt]), follow.tilt);
  const sheenX = useTransform(px, [0, 1], ["-25%", "25%"]);
  const sheenY = useTransform(py, [0, 1], ["-25%", "25%"]);
  const glare = useTransform(px, [0, 0.5, 1], [0.5, 0.15, 0.5]);
  const active = canHover && !reduce;
  return (
    <div
      className={cn("[perspective:70em]", className)}
      onPointerMove={
        active
          ? (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              px.set((e.clientX - r.left) / r.width);
              py.set((e.clientY - r.top) / r.height);
            }
          : undefined
      }
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      <motion.div style={active ? { rotateX, rotateY, transformStyle: "preserve-3d" } : undefined} className="relative">
        {children}
        {active && <motion.div aria-hidden style={{ x: sheenX, y: sheenY, opacity: glare }} className="pointer-events-none absolute -inset-1/2 mix-blend-soft-light [background:linear-gradient(115deg,transparent_40%,rgb(255_255_255/.9)_50%,transparent_60%)]" />}
      </motion.div>
    </div>
  );
}

"use client";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";
import { follow } from "@/lib/motion-tokens";
import { useCanHover } from "@/lib/use-media";

/** Magnetic wrapper: listener on a padded static wrapper so the hit area doesn't run away. */
export function Magnetic({ children, strength = 0.3 }: { children: ReactNode; strength?: number }) {
  const reduce = useReducedMotion();
  const canHover = useCanHover();
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, follow.magnet);
  const y = useSpring(0, follow.magnet);
  const inner = useTransform(x, (v) => v * 0.35);
  const innerY = useTransform(y, (v) => v * 0.35);
  const active = canHover && !reduce;
  return (
    <div
      ref={ref}
      className="-m-3 inline-flex p-3"
      onPointerMove={
        active
          ? (e) => {
              const r = ref.current!.getBoundingClientRect();
              x.set((e.clientX - (r.left + r.width / 2)) * strength);
              y.set((e.clientY - (r.top + r.height / 2)) * strength);
            }
          : undefined
      }
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <motion.div style={{ x, y }}>
        <motion.div style={{ x: inner, y: innerY }}>{children}</motion.div>
      </motion.div>
    </div>
  );
}

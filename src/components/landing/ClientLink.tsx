"use client";
import { motion, useReducedMotion } from "motion/react";
import { Check, Star } from "lucide-react";
import { clientFeedback as cf } from "@/content/landing";
import { dur, ease } from "@/lib/motion-tokens";
import { SectionHeader } from "./SectionHeader";
import { Reveal } from "@/components/motion/Reveal";
import { TiltCard } from "@/components/motion/TiltCard";

/* Deterministic decorative QR pattern (not a scannable code). */
function QrArt() {
  const n = 17;
  const cells: Array<[number, number]> = [];
  let seed = 7;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const inFinder = (x < 6 && y < 6) || (x > n - 7 && y < 6) || (x < 6 && y > n - 7);
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if (!inFinder && seed % 100 < 46) cells.push([x, y]);
    }
  const finder = (ox: number, oy: number) => (
    <g key={`${ox}-${oy}`}>
      <rect x={ox} y={oy} width="6" height="6" fill="#050703" />
      <rect x={ox + 1} y={oy + 1} width="4" height="4" fill="#fff" />
      <rect x={ox + 2} y={oy + 2} width="2" height="2" fill="#050703" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="size-full" aria-hidden shapeRendering="crispEdges">
      <rect width={n} height={n} fill="#fff" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#050703" />
      ))}
      {finder(0, 0)}
      {finder(n - 6, 0)}
      {finder(0, n - 6)}
    </svg>
  );
}

export function ClientLink() {
  const reduce = useReducedMotion();
  const ph = cf.phone;
  return (
    <section aria-labelledby="client-title" className="overflow-hidden bg-bg py-24 lg:py-32">
      <div className="mx-auto grid max-w-[84em] items-center gap-16 px-5 sm:px-8 lg:grid-cols-2">
        <div className="flex flex-col gap-10">
          <SectionHeader id="client-title" eyebrow={cf.eyebrow} title={cf.title} lead={cf.lead} />
          <ul className="flex flex-col gap-3">
            {cf.points.map((t) => (
              <li key={t} className="flex items-center gap-3 text-base text-text">
                <span className="flex size-6 items-center justify-center rounded-full bg-ink text-white">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <Reveal className="relative flex justify-center">
          <TiltCard maxTilt={6}>
            <motion.div animate={reduce ? undefined : { y: [0, -6, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} className="relative w-[17.5em] rounded-[2.4em] border-[0.55em] border-ink bg-bg p-5 shadow-xl">
              <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-ink/80" />
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">SBS</p>
              <p className="mt-2 text-md font-semibold leading-snug text-ink text-balance">{ph.title}</p>
              <p className="mt-2 text-xs text-text-secondary text-pretty">{ph.welcome}</p>
              <p className="mt-5 text-sm font-medium text-ink">{ph.q}</p>
              <div className="mt-2 flex gap-1.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.span key={i} initial={{ scale: 0.6, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.08, duration: dur.slow, ease: ease.out }}>
                    <Star className={`size-6 ${i <= 4 ? "fill-ink text-ink" : "text-border-strong"}`} />
                  </motion.span>
                ))}
              </div>
              <div className="mt-4 h-16 rounded-md border border-border-strong bg-canvas" />
              <div className="mt-4 rounded-md bg-ink py-2.5 text-center text-sm font-medium text-white">{ph.send}</div>
            </motion.div>
          </TiltCard>
          <motion.div initial={{ opacity: 0, y: 20, rotate: -4 }} whileInView={{ opacity: 1, y: 0, rotate: -4 }} viewport={{ once: true }} transition={{ delay: 0.5, duration: dur.reveal, ease: ease.outExpo }} className="absolute -bottom-6 start-[4%] hidden size-32 rounded-xl border border-border bg-bg p-3 shadow-lg sm:block lg:start-[8%]">
            <QrArt />
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}

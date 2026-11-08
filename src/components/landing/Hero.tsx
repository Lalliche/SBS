"use client";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ShieldCheck, VenetianMask } from "lucide-react";
import Image from "next/image";
import mark from "@/assets/sbs-logo.png";
import { hero } from "@/content/landing";
import { useEnter } from "@/lib/enter";
import { dur, ease } from "@/lib/motion-tokens";
import { Button } from "@/components/ui/Button";
import { Magnetic } from "@/components/motion/Magnetic";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { CountUp } from "@/components/motion/CountUp";
import { Radar, RadarLegend, SERIES } from "@/components/charts/Radar";
import { ProgressRing } from "@/components/charts/Ring";

function Chip({ kind, label, sub, className, delay }: { kind: "anon" | "named" | "quota"; label: string; sub: string; className: string; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: reduce ? 0 : delay, duration: dur.slow * 1.4, ease: ease.out }}
      className={`absolute z-20 ${className} ${kind !== "quota" ? "max-sm:hidden" : ""}`}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 6 + delay, repeat: Infinity, ease: "easeInOut" }}
        className="flex items-center gap-3 rounded-lg border border-border bg-bg/95 px-3.5 py-2.5 shadow-lg backdrop-blur-sm [transform:translateZ(40px)]"
      >
        <span className={`flex size-8 items-center justify-center rounded-md ${kind === "anon" ? "bg-ink text-white" : kind === "quota" ? "bg-accent-soft text-accent" : "bg-paper text-ink"}`}>
          {kind === "anon" ? <VenetianMask className="size-4" /> : <ShieldCheck className="size-4" />}
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold text-ink">{label}</span>
          <span className="block text-xs text-text-secondary">{sub}</span>
        </span>
      </motion.div>
    </motion.div>
  );
}

function SynthesisCard() {
  const c = hero.card;
  const series = [
    { id: "archive", label: c.archiveLabel, values: c.archive, ...SERIES.archive },
    { id: "ensemble", label: c.currentLabel, values: c.current, fill: true, ...SERIES.ensemble },
  ];
  return (
    <div className="relative mb-6 w-full max-w-[34em]">
      <TiltCard maxTilt={7}>
        <article aria-label="Aperçu d’une synthèse de fin d’année" className="relative overflow-hidden rounded-2xl border border-border bg-bg p-6 shadow-xl">
          <header className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-text-muted">{c.kicker}</p>
              <p className="mt-1.5 text-lg font-semibold tracking-[-0.01em] text-ink">{c.name}</p>
              <p className="text-sm text-text-secondary">{c.role}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success-bg px-2.5 py-1 text-xs font-medium text-success">
              <span className="size-1.5 rounded-full bg-success" />
              {c.status}
            </span>
          </header>
          <div className="py-2">
            <Radar axes={c.axes} series={series} size="92%" />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg bg-canvas px-4 py-3">
            <div className="flex items-center gap-3.5">
              <ProgressRing value={1} size="3.6em" stroke={9} tone="success" label={`${c.receivedValue} feedbacks reçus`} delay={0.5}>
                <span className="block text-md font-semibold text-ink">
                  <CountUp to={c.receivedValue} duration={1.4} delay={0.5} />
                </span>
              </ProgressRing>
              <p className="text-sm leading-snug text-text-secondary">
                <span className="block font-medium text-ink">{c.received}</span>
                {c.missions}
              </p>
            </div>
          </div>
          <div className="mt-3"><RadarLegend series={[{ id: "e", label: c.currentLabel, values: [], ...SERIES.ensemble }, { id: "a", label: c.archiveLabel, values: [], ...SERIES.archive }]} /></div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
            <div>
              <dt className="text-xs text-text-muted">{c.strength}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink">{c.strengthValue}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">{c.axis}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink">{c.axisValue}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-text-muted">{c.note}</p>
        </article>
      </TiltCard>
      <Chip kind="anon" {...hero.chips[0]} className="start-2 -top-6 xl:-start-20 xl:top-[30%]" delay={1.5} />
      <Chip kind="named" {...hero.chips[1]} className="-end-1 top-[8%] xl:-end-12" delay={1.8} />
      <Chip kind="quota" {...hero.chips[2]} className="-bottom-7 end-[8%]" delay={2.1} />
    </div>
  );
}

export function Hero() {
  const enter = useEnter();
  const reduce = useReducedMotion();
  return (
    <section id="top" aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-paper pb-24 pt-32 sm:pt-36 lg:pb-32">
      {/* hairline column grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 mx-auto grid max-w-[84em] grid-cols-4 px-5 sm:px-8">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="border-s border-ink/[0.06] last:border-e" />
        ))}
      </div>
      {/* brand mark watermark */}
      <div aria-hidden className="pointer-events-none absolute -bottom-10 -start-6 -z-10 h-[26em] w-[12.5em] overflow-hidden opacity-[0.07] max-sm:hidden">
        <Image src={mark} alt="" className="h-[26em] w-auto max-w-none" sizes="700px" />
      </div>
      <div className="mx-auto grid max-w-[84em] items-center gap-16 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <motion.p initial={{ opacity: 0, y: reduce ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur.slow, ease: ease.out }} className="mb-6 inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">
            <span aria-hidden className="h-px w-8 bg-accent" />
            {hero.eyebrow}
          </motion.p>
          <SplitReveal id="hero-title" as="h1" immediate text={hero.title} emphasis={hero.emphasis} className="font-display text-[clamp(2.6em,6.2vw,5.2em)] font-semibold leading-[1.02] tracking-[-0.03em] text-ink text-balance" />
          <motion.p initial={{ opacity: 0, y: reduce ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : 0.7, duration: dur.reveal, ease: ease.outExpo }} className="mt-7 max-w-[34em] text-md leading-relaxed text-text-secondary text-pretty">
            {hero.lead}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: reduce ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : 0.85, duration: dur.reveal, ease: ease.outExpo }} className="mt-9 flex flex-wrap items-center gap-4">
            <Magnetic>
              <Button size="lg" variant="accent" iconRight={<ArrowRight className="size-4" />} onClick={() => enter("u-sophie")}>
                {hero.primary}
              </Button>
            </Magnetic>
            <Button size="lg" variant="secondary" onClick={() => enter("u-sophie", { tour: true })}>
              {hero.secondary}
            </Button>
          </motion.div>
          <motion.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 1.1, duration: dur.reveal }} className="mt-12 flex flex-wrap gap-x-7 gap-y-2 border-t border-ink/10 pt-6 text-sm text-text-secondary">
            {hero.proof.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <span aria-hidden className="size-1 rounded-full bg-ink" />
                {p}
              </li>
            ))}
          </motion.ul>
        </div>
        <motion.div initial={{ opacity: 0, y: reduce ? 0 : 40, rotateX: reduce ? 0 : 14 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: reduce ? 0 : 0.35, duration: dur.hero, ease: ease.outExpo }} style={{ transformPerspective: 1200 }} className="flex justify-center lg:justify-end">
          <SynthesisCard />
        </motion.div>
      </div>
    </section>
  );
}

"use client";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Archive, Lock, VenetianMask } from "lucide-react";
import { useRef, useState } from "react";
import { cycle } from "@/content/landing";
import { dur, ease, swap } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/use-media";
import { SectionHeader } from "./SectionHeader";
import { Radar, SERIES } from "@/components/charts/Radar";
import { hero } from "@/content/landing";

const v = cycle.visual;

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div role="img" aria-label={label} className="w-full max-w-[30em] rounded-2xl border border-border bg-bg p-6 shadow-xl">
      {children}
    </div>
  );
}

function OpenVisual() {
  const reduce = useReducedMotion();
  return (
    <Frame label="Cycle annuel ouvert avec un repère pour aujourd’hui">
      <p className="text-xs font-medium uppercase tracking-[0.1em] text-text-muted">{v.open.range}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{v.open.title}</p>
      <div className="relative mt-9 mb-3">
        <div className="h-2 overflow-hidden rounded-full bg-paper-deep">
          <motion.div initial={{ scaleX: reduce ? 0.36 : 0 }} animate={{ scaleX: 0.36 }} transition={{ duration: 1.2, ease: ease.outExpo, delay: 0.15 }} className="h-full origin-left rounded-full bg-ink" />
        </div>
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: dur.slow }} className="absolute -top-8 flex -translate-x-1/2 flex-col items-center" style={{ left: "36%" }}>
          <span className="rounded bg-accent px-2 py-0.5 text-xs font-medium text-white">{v.open.today}</span>
          <span className="h-3 w-px bg-accent" />
        </motion.div>
      </div>
      <ul className="mt-6 flex flex-col gap-2.5 text-sm text-text-secondary">
        {v.open.items.map((t, i) => (
          <motion.li key={t} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.1, duration: dur.slow, ease: ease.out }} className="flex items-center gap-2.5 rounded-md border border-border bg-canvas px-3 py-2.5">
            <span className="size-1.5 rounded-full bg-ink" />
            {t}
          </motion.li>
        ))}
      </ul>
    </Frame>
  );
}

function ExchangeVisual() {
  const [anon, setAnon] = useState(false);
  const reduce = useReducedMotion();
  return (
    <Frame label="Un feedback écrit avec le choix nominatif ou anonyme">
      <span className="inline-flex rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-text-secondary">{v.exchange.question}</span>
      <p className="mt-3 text-base font-medium text-ink text-pretty">{v.exchange.prompt}</p>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: dur.slow }} className="mt-3 rounded-md border border-border-strong bg-canvas px-3 py-2.5 text-sm leading-relaxed text-text">
        {v.exchange.answer}
      </motion.p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {[false, true].map((a) => (
          <button key={String(a)} type="button" onClick={() => setAnon(a)} aria-pressed={anon === a} className={cn("relative flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors duration-150", anon === a ? "border-ink bg-ink text-white" : "border-border-strong text-text-secondary hover:border-ink/40")}>
            {a && <VenetianMask className="size-4" />}
            {a ? v.exchange.anonymous : v.exchange.named}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p key={String(anon)} variants={swap} initial={reduce ? false : "initial"} animate="animate" exit="exit" className="mt-3 flex items-start gap-2 text-xs text-text-secondary">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          {anon ? "Votre identité n’est enregistrée nulle part. Envoi définitif." : "Votre nom sera visible par la personne et son responsable."}
        </motion.p>
      </AnimatePresence>
      <div className="mt-4 flex justify-end">
        <span className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-white">{v.exchange.send}</span>
      </div>
    </Frame>
  );
}

function SynthVisual() {
  const c = hero.card;
  return (
    <Frame label="Aperçu de la synthèse : radar, points forts et axes">
      <p className="text-md font-semibold text-ink">{v.synth.title}</p>
      <Radar axes={c.axes} series={[{ id: "e", label: c.currentLabel, values: c.current, fill: true, ...SERIES.ensemble }]} size="86%" />
      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md border border-success/20 bg-success-bg p-3">
          <p className="text-xs font-semibold text-success">{v.synth.strengths}</p>
          <p className="mt-1 text-text">{v.synth.s1}</p>
        </div>
        <div className="rounded-md border border-warning/25 bg-warning-bg p-3">
          <p className="text-xs font-semibold text-warning">{v.synth.axes}</p>
          <p className="mt-1 text-text">{v.synth.a1}</p>
        </div>
      </div>
    </Frame>
  );
}

function ArchiveVisual() {
  return (
    <div role="img" aria-label="Pile de cycles : FY28 ouvert, FY27 et FY26 archivés" className="relative h-[19em] w-full max-w-[28em]">
      {v.archive.cycles.map((c, i) => (
        <motion.div key={c.n} initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 - i * 0.04 }} transition={{ delay: (2 - i) * 0.18, duration: dur.reveal, ease: ease.outExpo }} style={{ zIndex: 10 - i, top: `${i * 2.6}em` }} className={cn("absolute inset-x-0 flex items-center justify-between rounded-2xl border bg-bg p-6 shadow-lg", i === 0 ? "border-ink" : "border-border")}>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.1em] text-text-muted">Cycle</p>
            <p className="text-xl font-semibold tracking-tight text-ink">{c.n}</p>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", i === 0 ? "border-info/20 bg-info-bg text-info" : "border-border bg-paper text-text-secondary")}>
            {i > 0 && <Archive className="size-3.5" />}
            {c.s}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

const VISUALS = [OpenVisual, ExchangeVisual, SynthVisual, ArchiveVisual];

export function CycleStory() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const mobile = useIsMobile();
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const rail = useTransform(scrollYProgress, [0.04, 0.96], [0, 1]);
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const i = Math.min(cycle.steps.length - 1, Math.max(0, Math.floor(p * cycle.steps.length)));
    if (i !== stepRef.current) {
      stepRef.current = i;
      setStep(i);
    }
  });

  const stacked = reduce || mobile;
  if (stacked) {
    return (
      <section id={cycle.id} aria-labelledby="cycle-title" className="bg-bg py-24">
        <div className="mx-auto max-w-[84em] px-5 sm:px-8">
          <SectionHeader id="cycle-title" eyebrow={cycle.eyebrow} title={cycle.title} lead={cycle.lead} />
          <ol className="mt-12 flex flex-col gap-14">
            {cycle.steps.map((s, i) => {
              const V = VISUALS[i];
              return (
                <li key={s.n} className="flex flex-col gap-6">
                  <div>
                    <p className="font-display text-2xl text-accent">{s.n}</p>
                    <h3 className="mt-1 text-lg font-semibold text-ink">{s.title}</h3>
                    <p className="mt-2 text-base text-text-secondary text-pretty">{s.text}</p>
                  </div>
                  <div className="flex justify-center rounded-2xl bg-paper p-5">
                    <V />
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    );
  }

  const Active = VISUALS[step];
  return (
    <section id={cycle.id} ref={ref} aria-labelledby="cycle-title" className="relative bg-bg" style={{ height: `${cycle.steps.length * 95 + 30}svh` }}>
      <div className="sticky top-0 flex h-svh items-center overflow-clip">
        <div className="mx-auto grid w-full max-w-[84em] gap-16 px-8 lg:grid-cols-[1fr_1.05fr]">
          <div className="flex flex-col justify-center gap-10">
            <SectionHeader eyebrow={cycle.eyebrow} title={cycle.title} lead={cycle.lead} />
            <div className="relative flex gap-6">
              <div aria-hidden className="relative w-px shrink-0 bg-border">
                <motion.div style={{ scaleY: rail }} className="absolute inset-0 origin-top bg-accent" />
              </div>
              <ol className="flex flex-col gap-1">
                {cycle.steps.map((s, i) => (
                  <li key={s.n} aria-current={i === step ? "step" : undefined} className={cn("rounded-lg px-4 py-3 transition-[opacity,background-color] duration-300 ease-(--ease-out-strong)", i === step ? "bg-paper opacity-100" : "opacity-45")}>
                    <p className="flex items-baseline gap-3">
                      <span className="font-display text-md text-accent">{s.n}</span>
                      <span className="text-md font-semibold text-ink">{s.title}</span>
                    </p>
                    <p className={cn("max-w-[30em] text-sm text-text-secondary text-pretty", i === step ? "mt-1.5" : "hidden")}>{s.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="relative flex items-center justify-center rounded-3xl bg-paper">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step} variants={swap} initial="initial" animate="animate" exit="exit" className="flex w-full justify-center p-8">
                <Active />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

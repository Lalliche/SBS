"use client";
import { facts, guarantees } from "@/content/landing";
import { SectionHeader, Eyebrow } from "./SectionHeader";
import { CountUp } from "@/components/motion/CountUp";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";

export function Facts() {
  return (
    <section aria-labelledby="facts-title" className="bg-paper py-24 lg:py-28">
      <div className="mx-auto max-w-[84em] px-5 sm:px-8">
        <SectionHeader id="facts-title" eyebrow={facts.eyebrow} title={facts.title} />
        <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-4">
          {facts.items.map((f, i) => (
            <div key={f.label} className="flex flex-col gap-2 bg-paper p-6 sm:p-8">
              <dd className="font-display text-[clamp(2.4em,5vw,4em)] font-semibold leading-none tracking-[-0.03em] text-ink">
                <CountUp to={f.value} suffix={f.suffix} delay={i * 0.12} />
              </dd>
              <dt className="text-md font-medium text-ink">{f.label}</dt>
              <p className="text-sm text-text-secondary">{f.sub}</p>
            </div>
          ))}
        </dl>
        <div className="mt-24">
          <Eyebrow>{guarantees.eyebrow}</Eyebrow>
          <RevealGroup className="mt-8 grid gap-x-10 gap-y-8 border-t border-ink/15 pt-8 md:grid-cols-3">
            {guarantees.items.map((g, i) => (
              <RevealItem key={g.title}>
                <p className="font-display text-lg text-accent tabular-nums">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 text-lg font-semibold text-ink">{g.title}</h3>
                <p className="mt-2 text-base text-text-secondary text-pretty">{g.text}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}

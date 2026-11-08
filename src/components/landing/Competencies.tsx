"use client";
import { competencies as c } from "@/content/landing";
import { COMPETENCIES } from "@/lib/store/texts";
import { SectionHeader } from "./SectionHeader";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { SpotlightCard } from "@/components/motion/SpotlightCard";

export function Competencies() {
  return (
    <section id={c.id} aria-labelledby="competencies-title" className="bg-bg py-24 lg:py-32">
      <div className="mx-auto max-w-[84em] px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHeader id="competencies-title" eyebrow={c.eyebrow} title={c.title} lead={c.lead} />
            <p className="mt-8 inline-flex items-center gap-2.5 border-s-2 border-accent ps-4 text-sm font-medium text-text-secondary">{c.hint}</p>
          </div>
          <RevealGroup step={0.07} className="grid gap-4 sm:grid-cols-2">
            {COMPETENCIES.map((comp, i) => (
              <RevealItem key={comp.id}>
                <SpotlightCard as="article" className="h-full">
                  <div className="flex h-full min-h-[13em] flex-col gap-4 p-6">
                    <span className="font-display text-lg text-accent tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="font-display text-xl font-semibold leading-tight tracking-[-0.015em] text-ink text-balance">{comp.name}</h3>
                    <p className="text-sm leading-relaxed text-text-secondary text-pretty">{comp.description}</p>
                  </div>
                </SpotlightCard>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}

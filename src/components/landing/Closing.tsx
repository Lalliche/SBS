"use client";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import logoLight from "@/assets/sbs-logo-light.png";
import mark from "@/assets/sbs-logo.png";
import { finalCta, footer } from "@/content/landing";
import { useEnter } from "@/lib/enter";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Reveal } from "@/components/motion/Reveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { Button } from "@/components/ui/Button";

export function FinalCta() {
  const enter = useEnter();
  return (
    <section aria-labelledby="final-title" className="relative isolate overflow-hidden bg-ink py-28 lg:py-36">
      <div aria-hidden className="pointer-events-none absolute -end-10 -top-8 -z-10 h-[34em] w-[16em] overflow-hidden opacity-[0.16] max-sm:hidden">
        <Image src={mark} alt="" className="h-[34em] w-auto max-w-none" sizes="800px" />
      </div>
      <div className="mx-auto flex max-w-[60em] flex-col items-start gap-8 px-5 sm:px-8">
        <SplitReveal id="final-title" text={finalCta.title} className="font-display text-[clamp(2.2em,5vw,4.2em)] font-semibold leading-[1.05] tracking-[-0.03em] text-white text-balance" />
        <Reveal>
          <p className="max-w-[38em] text-md leading-relaxed text-white/70 text-pretty">{finalCta.lead}</p>
        </Reveal>
        <Reveal className="flex flex-wrap items-center gap-4">
          <Magnetic>
            <Button size="lg" variant="accent" iconRight={<ArrowRight className="size-4" />} onClick={() => enter("u-sophie")}>
              {finalCta.primary}
            </Button>
          </Magnetic>
          <Button size="lg" variant="inverse" onClick={() => enter("u-sophie", { tour: true })}>
            {finalCta.secondary}
          </Button>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  const enter = useEnter();
  return (
    <footer className="border-t border-white/10 bg-ink py-10">
      <div className="mx-auto flex max-w-[84em] flex-wrap items-center justify-between gap-6 px-5 sm:px-8">
        <Image src={logoLight} alt="SBS — Sovereign Business & Strategy" className="h-9 w-auto" sizes="120px" />
        <p className="max-w-[28em] text-sm text-white/55">{footer.note}</p>
        <nav aria-label="Liens secondaires" className="flex items-center gap-6 text-sm text-white/70">
          <a href={footer.links[0].href} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
            {footer.links[0].label}
          </a>
          <button type="button" onClick={() => enter("u-karim")} className="transition-colors hover:text-white">
            {footer.links[1].label}
          </button>
        </nav>
      </div>
      <p className="mx-auto mt-6 max-w-[84em] px-5 text-xs text-white/40 sm:px-8">{footer.legal}</p>
    </footer>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Reveal } from "@/components/motion/Reveal";

export function Eyebrow({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  return (
    <p className={cn("inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.14em]", tone === "dark" ? "text-white/60" : "text-text-secondary")}>
      <span aria-hidden className="h-px w-8 bg-accent" />
      {children}
    </p>
  );
}

export function SectionHeader({ eyebrow, title, lead, tone = "light", className, align = "start", id }: { id?: string; eyebrow: string; title: string; lead?: string; tone?: "light" | "dark"; className?: string; align?: "start" | "center" }) {
  return (
    <div className={cn("flex flex-col gap-5", align === "center" && "items-center text-center", className)}>
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      <SplitReveal id={id} text={title} className={cn("font-display text-[clamp(2em,3.8vw,3.2em)] font-semibold leading-[1.08] tracking-[-0.025em] text-balance", tone === "dark" ? "text-white" : "text-ink")} />
      {lead && (
        <Reveal>
          <p className={cn("max-w-[38em] text-md leading-relaxed text-pretty", tone === "dark" ? "text-white/70" : "text-text-secondary")}>{lead}</p>
        </Reveal>
      )}
    </div>
  );
}

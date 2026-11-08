"use client";
import { Plus } from "lucide-react";
import { useState } from "react";
import { faq } from "@/content/landing";
import { cn } from "@/lib/utils";
import { SectionHeader } from "./SectionHeader";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id={faq.id} aria-labelledby="faq-title" className="bg-bg py-24 lg:py-28">
      <div className="mx-auto grid max-w-[84em] gap-12 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <SectionHeader id="faq-title" eyebrow={faq.eyebrow} title={faq.title} />
        <ul className="divide-y divide-border border-y border-border">
          {faq.items.map((it, i) => {
            const isOpen = open === i;
            return (
              <li key={it.q}>
                <h3>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-6 py-5 text-start text-md font-semibold text-ink transition-colors hover:text-accent focus-visible:shadow-none focus-visible:text-accent">
                    {it.q}
                    <Plus className={cn("size-5 shrink-0 transition-transform duration-200 ease-(--ease-out-strong)", isOpen && "rotate-45")} />
                  </button>
                </h3>
                {isOpen && <p className="max-w-[40em] pb-6 text-base leading-relaxed text-text-secondary text-pretty animate-hero-in">{it.a}</p>}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

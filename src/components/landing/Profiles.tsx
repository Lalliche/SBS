"use client";
import { ArrowRight, Check } from "lucide-react";
import { profiles as p } from "@/content/landing";
import { useEnter } from "@/lib/enter";
import { SectionHeader } from "./SectionHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { SpotlightCard } from "@/components/motion/SpotlightCard";
import { Badge } from "@/components/ui/Badge";

const HUES: Record<string, number> = { "u-sophie": 150, "u-thomas": 8, "u-lucas": 8, "u-claire": 8 };

export function Profiles() {
  const enter = useEnter();
  return (
    <section id={p.id} aria-labelledby="profiles-title" className="bg-paper py-24 lg:py-32">
      <div className="mx-auto max-w-[84em] px-5 sm:px-8">
        <SectionHeader id="profiles-title" eyebrow={p.eyebrow} title={p.title} lead={p.lead} />
        <RevealGroup step={0.09} className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {p.cards.map((c) => {
            const [first, ...rest] = c.name.split(" ");
            return (
              <RevealItem key={c.userId} className="h-full">
                <SpotlightCard as="article" className="h-full">
                  <div className="flex h-full flex-col gap-5 p-6">
                    <div className="flex items-center gap-3.5">
                      <Avatar user={{ firstName: first, lastName: rest.join(" "), departmentId: c.userId }} dept={{ id: c.userId, name: "", hue: HUES[c.userId] ?? 0 }} size="lg" />
                      <div className="min-w-0">
                        <p className="truncate text-md font-semibold text-ink">{c.name}</p>
                        <p className="truncate text-sm text-text-secondary">{c.job}</p>
                      </div>
                    </div>
                    <Badge tone="neutral" className="self-start">
                      {c.role}
                    </Badge>
                    <ul className="flex flex-1 flex-col gap-2.5">
                      {c.caps.map((cap) => (
                        <li key={cap} className="flex items-start gap-2.5 text-sm text-text-secondary">
                          <Check className="mt-0.5 size-4 shrink-0 text-ink" strokeWidth={2.2} />
                          <span className="text-pretty">{cap}</span>
                        </li>
                      ))}
                    </ul>
                    <Button variant="primary" className="w-full" iconRight={<ArrowRight className="size-4" />} onClick={() => enter(c.userId)}>
                      {p.enter} {first}
                    </Button>
                  </div>
                </SpotlightCard>
              </RevealItem>
            );
          })}
        </RevealGroup>
        <p className="mt-8 text-sm text-text-secondary">
          Vous gérez les comptes et les sauvegardes ?{" "}
          <button type="button" onClick={() => enter("u-karim")} className="font-medium text-ink underline underline-offset-4 hover:text-accent">
            {p.tech}
          </button>
        </p>
      </div>
    </section>
  );
}

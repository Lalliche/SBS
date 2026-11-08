"use client";
import { motion, useInView, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Database, Lock, UserRound, VenetianMask, X } from "lucide-react";
import { useRef } from "react";
import { anonymity as a } from "@/content/landing";
import { dur, ease } from "@/lib/motion-tokens";
import { Callout, Card, PageHeader } from "@/components/ui/Surface";

function Lane({ title, caption, anon, delay }: { title: string; caption: string; anon?: boolean; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const go = inView || reduce;
  return (
    <div ref={ref} className="rounded-xl border border-border bg-bg p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-text-muted">{title}</p>
      <div className="mt-5 flex items-center gap-3">
        <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-full border border-border-strong bg-canvas"><UserRound className="size-5" /></span>
        <div className="relative h-0.5 flex-1">
          <motion.span className="absolute inset-0 origin-left bg-ink" initial={{ scaleX: reduce ? 1 : 0 }} animate={{ scaleX: go ? (anon ? 0.4 : 1) : 0 }} transition={{ duration: 1.1, ease: ease.inOut, delay }} />
          {anon && <motion.span className="absolute -top-2.5 start-[42%] flex size-6 items-center justify-center rounded-full bg-accent text-white" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: go ? 1 : 0, scale: go ? 1 : 0.5 }} transition={{ delay: delay + 1.1, duration: dur.slow }}><X className="size-3.5" strokeWidth={3} /></motion.span>}
        </div>
        {anon && <span className="flex h-12 shrink-0 items-center gap-2 rounded-lg border border-dashed border-border-strong bg-canvas px-3 text-sm font-medium"><Database className="size-4" />{a.lanes.anon.store}</span>}
        {anon && <div className="relative h-0.5 w-10 sm:w-16"><motion.span className="absolute inset-0 origin-left bg-ink" initial={{ scaleX: reduce ? 1 : 0 }} animate={{ scaleX: go ? 1 : 0 }} transition={{ duration: 0.7, delay: delay + 1.5 }} /></div>}
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink text-white"><UserRound className="size-5" /></span>
      </div>
      <p className="mt-4 text-sm text-text-secondary">{caption}</p>
    </div>
  );
}

export default function AnonymatPage() {
  return (
    <div>
      <PageHeader breadcrumb={[{ label: "Aide & anonymat", href: "/app/aide" }, { label: "Comment fonctionne l’anonymat" }]} title="Comment fonctionne l’anonymat" description="Un feedback anonyme est écrit sans aucune référence à son auteur. Il n’y a donc rien à retrouver." />
      <div className="flex max-w-[56em] flex-col gap-6">
        <div className="grid gap-4"><Lane title={a.lanes.named.label} caption={a.lanes.named.caption} delay={0.1} /><Lane title={a.lanes.anon.label} caption={a.lanes.anon.caption} anon delay={0.3} /></div>
        <div className="grid gap-4 md:grid-cols-3">{a.guarantees.map((g, i) => <Card key={g.title}><span className="flex size-9 items-center justify-center rounded-full bg-ink text-white">{i === 0 ? <VenetianMask className="size-4" /> : i === 1 ? <Lock className="size-4" /> : <ArrowRight className="size-4" />}</span><h2 className="mt-3 text-md font-semibold text-ink">{g.title}</h2><p className="mt-1 text-sm text-text-secondary text-pretty">{g.text}</p></Card>)}</div>
        <Card padded={false}><table className="w-full text-base"><thead className="bg-canvas text-xs uppercase tracking-[0.06em] text-text-muted"><tr><th className="px-5 py-2.5 text-start">{a.table.stored.title}</th><th className="px-5 text-start">{a.table.notStored.title}</th></tr></thead><tbody>{a.table.stored.items.map((it, i) => <tr key={it} className="border-t border-border"><td className="px-5 py-3"><span className="flex items-center gap-2.5"><Check className="size-4 text-success" />{it}</span></td><td className="px-5"><span className="flex items-center gap-2.5"><X className="size-4 text-accent" />{a.table.notStored.items[i]}</span></td></tr>)}</tbody></table></Card>
        <Callout tone="neutral" title="Dans la pratique">Le journal d’administration enregistre « Un feedback anonyme a été envoyé » sans aucun acteur. Les exports, sauvegardes et aperçus utilisent les mêmes données : la garantie vaut partout.</Callout>
      </div>
    </div>
  );
}

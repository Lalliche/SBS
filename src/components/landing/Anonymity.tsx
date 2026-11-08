"use client";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Check, Lock, VenetianMask, X } from "lucide-react";
import { useRef } from "react";
import { anonymity as a } from "@/content/landing";
import { dur, ease } from "@/lib/motion-tokens";
import { SectionHeader } from "./SectionHeader";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";

function Node({ x, y, label, dim, delay, anon }: { x: number; y: number; label: string; dim?: boolean; delay: number; anon?: boolean }) {
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: dim ? 0.38 : 1 }} transition={{ delay, duration: 0.6 }}>
      <circle cx={x} cy={y} r={24} fill="#14170f" stroke={anon ? "rgb(255 255 255 / 0.25)" : "#fff"} strokeWidth={1.5} strokeDasharray={anon ? "3 3" : undefined} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff">
        {label.slice(0, 1)}
      </text>
      <text x={x} y={y + 44} textAnchor="middle" fontSize="11" fill="rgb(255 255 255 / 0.7)">
        {label}
      </text>
    </motion.g>
  );
}

function Diagram() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.45 });
  const reduce = useReducedMotion();
  const go = inView || !!reduce;
  const t = (d: number) => (reduce ? 0 : d);
  return (
    <svg ref={ref} viewBox="0 0 640 330" className="w-full" role="img" aria-label="Schéma : le feedback nominatif conserve le lien auteur–destinataire, le feedback anonyme le rompt à l’écriture.">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 1 L9 5 L0 9z" fill="#fff" />
        </marker>
      </defs>
      {/* lane labels */}
      <text x="0" y="22" fontSize="11" fontWeight="600" letterSpacing="1.4" fill="rgb(255 255 255 / 0.55)">
        {a.lanes.named.label.toUpperCase()}
      </text>
      <text x="0" y="192" fontSize="11" fontWeight="600" letterSpacing="1.4" fill="rgb(255 255 255 / 0.55)">
        {a.lanes.anon.label.toUpperCase()}
      </text>
      <line x1="0" x2="640" y1="168" y2="168" stroke="rgb(255 255 255 / 0.1)" strokeDasharray="2 6" />

      {/* Lane 1 — named: the link stays */}
      <Node x={60} y={80} label={a.lanes.named.from} delay={t(0.1)} />
      <Node x={580} y={80} label={a.lanes.named.to} delay={t(0.1)} />
      <motion.path d="M88 80 H548" stroke="#fff" strokeWidth={2} fill="none" markerEnd="url(#arrow)" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: go ? 1 : reduce ? 1 : 0 }} transition={{ delay: t(0.4), duration: reduce ? 0 : 1.4, ease: ease.inOut }} />
      <motion.text x="318" y="70" textAnchor="middle" fontSize="11" fill="rgb(255 255 255 / 0.65)" initial={{ opacity: 0 }} animate={{ opacity: go ? 1 : 0 }} transition={{ delay: t(1.4) }}>
        Auteur enregistré
      </motion.text>

      {/* Lane 2 — anonymous: the link breaks at write time */}
      <Node x={60} y={250} label={a.lanes.anon.from} dim anon delay={t(0.2)} />
      <Node x={580} y={250} label={a.lanes.anon.to} delay={t(0.2)} />
      {/* author → store: draws, then dissolves */}
      <motion.path d="M88 250 H238" stroke="#fff" strokeWidth={2} fill="none" strokeDasharray="5 5" initial={{ pathLength: reduce ? 0 : 0, opacity: 1 }} animate={go ? { pathLength: reduce ? 0 : [0, 1, 1], opacity: reduce ? 0 : [1, 1, 0] } : {}} transition={{ delay: t(0.6), duration: reduce ? 0 : 2.4, times: [0, 0.45, 1], ease: ease.inOut }} />
      <motion.g initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: go ? 1 : 0, scale: go ? 1 : 0.6 }} transition={{ delay: t(1.9), duration: dur.slow, ease: ease.out }} style={{ transformOrigin: "163px 250px", transformBox: "view-box" }}>
        <line x1="153" y1="240" x2="173" y2="260" stroke="#E4042C" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="173" y1="240" x2="153" y2="260" stroke="#E4042C" strokeWidth="2.5" strokeLinecap="round" />
      </motion.g>
      <motion.text x="163" y="226" textAnchor="middle" fontSize="11" fill="rgb(255 255 255 / 0.65)" initial={{ opacity: 0 }} animate={{ opacity: go ? 1 : 0 }} transition={{ delay: t(2.2) }}>
        Lien rompu
      </motion.text>
      {/* the anonymous store */}
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: go ? 1 : 0 }} transition={{ delay: t(0.5), duration: 0.6 }}>
        <rect x="250" y="224" width="140" height="52" rx="6" fill="#14170f" stroke="rgb(255 255 255 / 0.3)" />
        <text x="320" y="246" textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff">
          {a.lanes.anon.store}
        </text>
        <text x="320" y="262" textAnchor="middle" fontSize="10" fill="rgb(255 255 255 / 0.55)">
          sans auteur
        </text>
      </motion.g>
      <motion.path d="M390 250 H548" stroke="#fff" strokeWidth={2} fill="none" markerEnd="url(#arrow)" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: go ? 1 : reduce ? 1 : 0 }} transition={{ delay: t(2.3), duration: reduce ? 0 : 1, ease: ease.inOut }} />
      <motion.text x="469" y="240" textAnchor="middle" fontSize="11" fill="rgb(255 255 255 / 0.65)" initial={{ opacity: 0 }} animate={{ opacity: go ? 1 : 0 }} transition={{ delay: t(3) }}>
        Contenu seul
      </motion.text>
      <text x="0" y="318" fontSize="12" fill="rgb(255 255 255 / 0.6)">
        {a.lanes.anon.caption}
      </text>
    </svg>
  );
}

export function Anonymity() {
  return (
    <section id={a.id} aria-labelledby="anonymity-title" className="relative isolate overflow-hidden bg-ink py-24 lg:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(60em_30em_at_85%_0%,rgb(228_4_44/0.12),transparent_60%)]" />
      <div className="mx-auto max-w-[84em] px-5 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="flex flex-col gap-10">
            <SectionHeader id="anonymity-title" tone="dark" eyebrow={a.eyebrow} title={a.title} lead={a.lead} />
            <RevealGroup as="ul" className="flex flex-col gap-5">
              {a.guarantees.map((g, i) => (
                <RevealItem key={g.title} as="li" className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white">{i === 0 ? <VenetianMask className="size-4" /> : i === 1 ? <Lock className="size-4" /> : <Check className="size-4" />}</span>
                  <div>
                    <p className="text-md font-semibold text-white">{g.title}</p>
                    <p className="mt-0.5 text-base text-white/65 text-pretty">{g.text}</p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
          <div className="flex flex-col gap-8">
            <Reveal className="rounded-2xl border border-white/10 bg-ink-soft p-6 sm:p-8">
              <Diagram />
            </Reveal>
            <RevealGroup className="grid gap-4 sm:grid-cols-2">
              {[
                { ...a.table.stored, ok: true },
                { ...a.table.notStored, ok: false },
              ].map((col) => (
                <RevealItem key={col.title} className="rounded-xl border border-white/10 p-5">
                  <p className="mb-3 text-sm font-semibold text-white">{col.title}</p>
                  <ul className="flex flex-col gap-2">
                    {col.items.map((it) => (
                      <li key={it} className="flex items-center gap-2.5 text-sm text-white/70">
                        {col.ok ? <Check className="size-4 text-[#6FD0A0]" /> : <X className="size-4 text-accent" />}
                        {it}
                      </li>
                    ))}
                  </ul>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </div>
      </div>
    </section>
  );
}

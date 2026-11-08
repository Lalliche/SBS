"use client";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion-tokens";

export interface LineSeries {
  id: string;
  label: string;
  values: number[];
  color: string;
  dash?: string;
  marker: "circle" | "square";
}

const W = 640;
const H = 220;
const P = { l: 34, r: 12, t: 12, b: 28 };

export function LineChart({ labels, series, className }: { labels: string[]; series: LineSeries[]; className?: string }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const n = labels.length;
  const max = Math.max(5, ...series.flatMap((s) => s.values));
  const nice = Math.ceil(max / 4) * 4;
  const x = (i: number) => P.l + ((W - P.l - P.r) * i) / Math.max(1, n - 1);
  const y = (v: number) => P.t + (H - P.t - P.b) * (1 - v / nice);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i)} ${y(v)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(nice * t));
  return (
    <div className={cn("relative", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label="Évolution des feedbacks dans le cycle" onMouseLeave={() => setHover(null)} onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * W;
        setHover(Math.max(0, Math.min(n - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (n - 1)))));
      }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeDasharray={t === 0 ? undefined : "2 4"} />
            <text x={P.l - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-text-muted)" className="tabular-nums">
              {t}
            </text>
          </g>
        ))}
        {labels.map((l, i) => (i % 2 === 0 || n < 8) && (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">
            {l}
          </text>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="var(--color-border-strong)" />}
        {series.map((s, si) => (
          <g key={s.id}>
            <motion.path d={`${path(s.values)} L${x(n - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} fill={s.color} initial={{ opacity: 0 }} animate={{ opacity: 0.06 }} transition={{ delay: 0.6, duration: reduce ? 0 : 0.8 }} />
            <motion.path d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dash} initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : dur.draw, ease: ease.inOut, delay: si * 0.2 }} />
            {s.values.map((v, i) => (hover === i || i === n - 1) && (
              s.marker === "square" ? <rect key={i} x={x(i) - 3.5} y={y(v) - 3.5} width={7} height={7} fill={s.color} stroke="#fff" strokeWidth={1.5} /> : <circle key={i} cx={x(i)} cy={y(v)} r={4} fill={s.color} stroke="#fff" strokeWidth={1.5} />
            ))}
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 z-10 rounded-md bg-ink px-3 py-2 text-xs text-white shadow-md" style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > n / 2 ? "-105%" : "5%"})` }}>
          <p className="mb-1 font-semibold">Semaine du {labels[hover]}</p>
          {series.map((s) => (
            <p key={s.id} className="flex items-center gap-2 tabular-nums">
              <span className="size-2 rounded-full" style={{ background: s.color }} />
              {s.label} : {s.values[hover]}
            </p>
          ))}
        </div>
      )}
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
        {series.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <svg width="22" height="10" aria-hidden>
              <line x1="0" y1="5" x2="22" y2="5" stroke={s.color} strokeWidth="2.2" strokeDasharray={s.dash} />
              {s.marker === "square" ? <rect x="8" y="2" width="6" height="6" fill={s.color} /> : <circle cx="11" cy="5" r="3" fill={s.color} />}
            </svg>
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

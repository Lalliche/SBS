"use client";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion-tokens";

export interface RadarSeries {
  id: string;
  label: string;
  values: Array<number | null>;
  color: string;
  dash?: string; // svg dasharray
  marker: "circle" | "square" | "triangle" | "diamond" | "ring";
  fill?: boolean;
}

const MAX = 5;
const SIZE = 340;
const C = SIZE / 2;
const R = 122;

function pt(i: number, n: number, v: number) {
  const a = (Math.PI * 2 * i) / n - Math.PI / 2;
  const r = (R * v) / MAX;
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
}

function Marker({ kind, x, y, color, delay }: { kind: RadarSeries["marker"]; x: number; y: number; color: string; delay: number }) {
  const s = 4.5;
  const common = { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { delay, duration: 0.3, ease: ease.out }, style: { transformOrigin: `${x}px ${y}px`, transformBox: "view-box" as const } };
  if (kind === "square") return <motion.rect x={x - s} y={y - s} width={s * 2} height={s * 2} fill={color} stroke="#fff" strokeWidth={1.5} {...common} />;
  if (kind === "triangle") return <motion.path d={`M${x} ${y - s - 1} L${x + s + 1} ${y + s} L${x - s - 1} ${y + s} Z`} fill={color} stroke="#fff" strokeWidth={1.5} {...common} />;
  if (kind === "diamond") return <motion.path d={`M${x} ${y - s - 1.5} L${x + s + 1.5} ${y} L${x} ${y + s + 1.5} L${x - s - 1.5} ${y} Z`} fill="#fff" stroke={color} strokeWidth={2} {...common} />;
  if (kind === "ring") return <motion.circle cx={x} cy={y} r={s} fill="#fff" stroke={color} strokeWidth={2} {...common} />;
  return <motion.circle cx={x} cy={y} r={s} fill={color} stroke="#fff" strokeWidth={1.5} {...common} />;
}

export function Radar({ axes, series, className, size = "100%" }: { axes: string[]; series: RadarSeries[]; className?: string; size?: string }) {
  const reduce = useReducedMotion();
  const n = axes.length;
  const [hover, setHover] = useState<number | null>(null);
  const rings = [1, 2, 3, 4, 5];
  const poly = (vals: Array<number | null>) => vals.map((v, i) => pt(i, n, v ?? 0).join(",")).join(" ");
  const pathD = (vals: Array<number | null>) => vals.map((v, i) => `${i ? "L" : "M"}${pt(i, n, v ?? 0).join(" ")}`).join(" ") + "Z";
  const labelAnchor = (i: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const x = Math.cos(a);
    return x > 0.3 ? "start" : x < -0.3 ? "end" : "middle";
  };
  return (
    <div className={cn("relative mx-auto aspect-square", className)} style={{ width: size, maxWidth: "26em" }}>
      <svg viewBox={`-62 -4 ${SIZE + 124} ${SIZE + 8}`} className="size-full overflow-visible" role="img" aria-label={`Radar des ${n} compétences`} onMouseLeave={() => setHover(null)}>
        {rings.map((r) => (
          <polygon key={r} points={Array.from({ length: n }, (_, i) => pt(i, n, r).join(",")).join(" ")} fill="none" stroke={r === 3 ? "var(--color-border-strong)" : "var(--color-border)"} strokeWidth={r === 3 ? 1.2 : 1} strokeDasharray={r === 3 ? "3 3" : undefined} />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pt(i, n, MAX);
          return <line key={i} x1={C} y1={C} x2={x} y2={y} stroke="var(--color-border)" strokeWidth={1} />;
        })}
        {rings.map((r) => (
          <text key={r} x={C + 4} y={C - (R * r) / MAX + 3} fontSize="8.5" fill="var(--color-text-muted)" className="tabular-nums">
            {r}
          </text>
        ))}
        {series.map((s, si) => (
          <g key={s.id}>
            {s.fill && <motion.polygon points={poly(s.values)} fill={s.color} initial={{ opacity: 0 }} animate={{ opacity: 0.1 }} transition={{ delay: 0.5 + si * 0.15, duration: reduce ? 0 : 0.8 }} />}
            <motion.path d={pathD(s.values)} fill="none" stroke={s.color} strokeWidth={2.2} strokeLinejoin="round" strokeDasharray={s.dash} initial={{ pathLength: reduce ? 1 : 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: reduce ? 0 : dur.draw, ease: ease.inOut, delay: si * 0.15, opacity: { duration: 0.2 } }} />
            {s.values.map((v, i) => {
              if (v === null) return null;
              const [x, y] = pt(i, n, v);
              return <Marker key={i} kind={s.marker} x={x} y={y} color={s.color} delay={reduce ? 0 : 0.6 + i * 0.07 + si * 0.1} />;
            })}
          </g>
        ))}
        {axes.map((label, i) => {
          const [x, y] = pt(i, n, MAX + 0.62);
          const words = label.split(" ");
          const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [label];
          return (
            <g key={label} onMouseEnter={() => setHover(i)} className="cursor-default">
              <text x={x} y={y - ((lines.length - 1) * 5)} textAnchor={labelAnchor(i)} fontSize="11.5" fontWeight={hover === i ? 600 : 500} fill={hover === i ? "var(--color-ink)" : "var(--color-text-secondary)"}>
                {lines.map((l, k) => (
                  <tspan key={k} x={x} dy={k ? 13 : 0}>
                    {l}
                  </tspan>
                ))}
              </text>
              <circle cx={x} cy={y} r={26} fill="transparent" />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute start-1/2 top-1 z-10 -translate-x-1/2 rounded-md bg-ink px-3 py-2 text-xs text-white shadow-md">
          <p className="mb-1 font-semibold">{axes[hover]}</p>
          {series.map((s) => (
            <p key={s.id} className="flex items-center gap-2 tabular-nums">
              <span className="size-2 rounded-full" style={{ background: s.color }} />
              {s.label} : {s.values[hover] === null ? "—" : s.values[hover]!.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function RadarLegend({ series }: { series: RadarSeries[] }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-text-secondary">
      {series.map((s) => (
        <li key={s.id} className="flex items-center gap-1.5">
          <svg width="22" height="10" aria-hidden>
            <line x1="0" y1="5" x2="22" y2="5" stroke={s.color} strokeWidth="2.2" strokeDasharray={s.dash} />
            {s.marker === "square" ? <rect x="8" y="2" width="6" height="6" fill={s.color} /> : s.marker === "triangle" ? <path d="M11 1.5 L15 8.5 L7 8.5Z" fill={s.color} /> : s.marker === "diamond" ? <path d="M11 1 L15 5 L11 9 L7 5Z" fill="#fff" stroke={s.color} strokeWidth="1.6" /> : s.marker === "ring" ? <circle cx="11" cy="5" r="3" fill="#fff" stroke={s.color} strokeWidth="1.6" /> : <circle cx="11" cy="5" r="3" fill={s.color} />}
          </svg>
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/* Series colours per the design system (also differentiated by dash + marker) */
export const SERIES = {
  ensemble: { color: "var(--color-ink)", marker: "circle" as const },
  RESPONSABLE: { color: "var(--color-accent)", marker: "square" as const },
  PAIR: { color: "var(--color-series-pairs)", marker: "triangle" as const },
  EQUIPE: { color: "var(--color-series-team)", marker: "diamond" as const, dash: "6 4" },
  archive: { color: "var(--color-series-archive)", marker: "ring" as const, dash: "2 4" },
};

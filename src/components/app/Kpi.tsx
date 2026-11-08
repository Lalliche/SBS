"use client";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/motion/CountUp";

export function Kpi({ label, value, decimals = 0, suffix = "", hint, href, spark, tone = "default" }: { label: string; value: number; decimals?: number; suffix?: string; hint?: ReactNode; href?: string; spark?: ReactNode; tone?: "default" | "warn" }) {
  const body = (
    <div className={cn("group flex h-full flex-col gap-3 rounded-lg border bg-bg p-5 transition-[border-color,transform] duration-150 ease-(--ease-out-strong)", href ? "border-border hover:border-ink/40" : "border-border", tone === "warn" && "border-warning/30")}>
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-text-secondary">{label}</p>
        {href && <ArrowUpRight className="size-4 text-text-muted transition-colors group-hover:text-ink" />}
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-[2em] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">
          <CountUp to={value} decimals={decimals} suffix={suffix} />
        </p>
        {spark}
      </div>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block focus-visible:shadow-none focus-visible:outline-2 focus-visible:outline-ink">
      {body}
    </Link>
  ) : (
    body
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "ink" | "accent" | "success" | "warning" | "danger" | "info" | "violet";

const tones: Record<Tone, string> = {
  neutral: "bg-paper text-text-secondary border-border",
  ink: "bg-ink text-white border-ink",
  accent: "bg-accent-soft text-accent-deep border-accent/20",
  success: "bg-success-bg text-success border-success/20",
  warning: "bg-warning-bg text-warning border-warning/25",
  danger: "bg-danger-bg text-danger border-danger/20",
  info: "bg-info-bg text-info border-info/20",
  violet: "bg-[#F1EDF8] text-[#5B3FA0] border-[#5B3FA0]/20",
};
const dots: Record<Tone, string> = {
  neutral: "bg-text-muted",
  ink: "bg-white",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  violet: "bg-[#5B3FA0]",
};

export function Badge({ tone = "neutral", dot, children, className, icon }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}>
      {dot && <span aria-hidden className={cn("size-1.5 rounded-full", dots[tone])} />}
      {icon}
      {children}
    </span>
  );
}

/* Central status map (spec §10): status is never colour alone — dot + label. */
const STATUS: Record<string, { label: string; tone: Tone }> = {
  OUVERT: { label: "Ouvert", tone: "info" },
  ARCHIVE: { label: "Archivé", tone: "neutral" },
  A_VENIR: { label: "À venir", tone: "violet" },
  NON_COMMENCEE: { label: "Non commencée", tone: "neutral" },
  EN_REDACTION: { label: "En rédaction", tone: "info" },
  VALIDEE: { label: "Validée", tone: "success" },
  EN_ATTENTE: { label: "En attente", tone: "warning" },
  TRAITEE: { label: "Traitée", tone: "success" },
  DECLINEE: { label: "Déclinée", tone: "neutral" },
  ACTIF: { label: "Actif", tone: "success" },
  EXPIRE: { label: "Expiré", tone: "danger" },
  DESACTIVE: { label: "Désactivé", tone: "neutral" },
  INACTIF: { label: "Inactif", tone: "neutral" },
  EN_COURS: { label: "En cours", tone: "info" },
  TERMINEE: { label: "Terminée", tone: "neutral" },
  ATTEINT: { label: "Atteint", tone: "success" },
  EN_BONNE_VOIE: { label: "En bonne voie", tone: "info" },
  EN_RETARD: { label: "En retard", tone: "warning" },
};
export function StatusPill({ status, label }: { status: string; label?: string }) {
  const s = STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return (
    <Badge tone={s.tone} dot>
      {label ?? s.label}
    </Badge>
  );
}

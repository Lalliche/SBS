"use client";
import { ChevronDown, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { act } from "@/lib/store/store";
import { hideFeedback } from "@/lib/store/actions";
import { fmtDate, fmtNum, relationLabel } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import type { FeedbackView } from "@/lib/store/selectors";
import { AnonymousBadge, Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function FeedbackCard({ f, defaultOpen = false, showRecipient = false, compact = false, noActions = false }: { f: FeedbackView; defaultOpen?: boolean; showRecipient?: boolean; compact?: boolean; noActions?: boolean }) {
  const { s, me } = useSession();
  const [open, setOpen] = useState(defaultOpen);
  const mission = s.missions.find((m) => m.id === f.missionId);
  const recipient = s.users.find((u) => u.id === f.recipientId);
  const qs = s.questions.filter((q) => q.kind === "COLLAB" && q.active).sort((a, b) => a.order - b.order);
  const answered = qs.filter((q) => f.answers[q.id]?.trim());
  const shown = open ? answered : answered.slice(0, compact ? 1 : 2);
  const ratings = s.competencies.filter((c) => f.ratings[c.id]);
  const canHide = !noActions && me?.role === "ADMIN_RH" && f.kind === "ANONYME" && s.settings.visibility.rhCanHideAnonymous;
  return (
    <article className="rounded-lg border border-border bg-bg p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {f.kind === "ANONYME" ? (
            <AnonymousBadge />
          ) : f.author ? (
            <>
              <Avatar user={f.author} dept={s.departments.find((d) => d.id === f.author!.departmentId)} size="sm" />
              <span className="truncate text-base font-medium text-ink">
                {f.author.firstName} {f.author.lastName}
              </span>
            </>
          ) : (
            <Badge tone="neutral">Nominatif · nom masqué</Badge>
          )}
          {f.relation && <Badge tone="neutral">{relationLabel[f.relation]}</Badge>}
          {showRecipient && recipient && <span className="text-sm text-text-muted">→ {recipient.firstName} {recipient.lastName}</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          {mission && <span className="max-w-[18em] truncate">{mission.name}</span>}
          <span aria-hidden>·</span>
          <time dateTime={f.createdAt}>{fmtDate(f.createdAt)}</time>
        </div>
      </header>
      {f.hidden ? (
        <p className="mt-3 flex items-center gap-2 rounded-md bg-paper px-3 py-2 text-sm text-text-muted">
          <EyeOff className="size-4" /> Texte masqué par les RH.
          {canHide && (
            <button type="button" className="ms-auto font-medium text-ink underline underline-offset-2" onClick={() => act((d) => hideFeedback(d, me!.id, f.id, false))}>
              Rétablir
            </button>
          )}
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {shown.map((q) => (
            <div key={q.id}>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">{s.competencies.find((c) => c.id === q.competencyId)?.name ?? "Commentaire libre"}</p>
              <p className="mt-0.5 text-base leading-relaxed text-text text-pretty">{f.answers[q.id]}</p>
            </div>
          ))}
          {answered.length === 0 && <p className="text-sm text-text-muted">Aucune réponse écrite.</p>}
        </div>
      )}
      <footer className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {ratings.length ? (
            ratings.map((c) => (
              <span key={c.id} title={`${c.name} : ${f.ratings[c.id]} / 5`} className={cn("inline-flex items-center gap-1 rounded-full border border-border bg-canvas px-2 py-0.5 text-xs text-text-secondary tabular-nums")}>
                <span className="max-w-[7em] truncate">{c.name}</span>
                <span className="font-semibold text-ink">{fmtNum(f.ratings[c.id], 0)}</span>
              </span>
            ))
          ) : (
            <span className="text-xs text-text-muted">Aucune note — facultatif</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {canHide && !f.hidden && (
            <Button variant="ghost" size="sm" icon={<EyeOff className="size-3.5" />} onClick={() => act((d) => hideFeedback(d, me!.id, f.id, true))}>
              Masquer
            </Button>
          )}
          {answered.length > shown.length || open ? (
            <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:text-accent focus-visible:shadow-none">
              {open ? "Réduire" : `Voir les ${answered.length} réponses`}
              <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
            </button>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

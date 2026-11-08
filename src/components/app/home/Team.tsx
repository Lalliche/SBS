"use client";
import { ArrowRight, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { act } from "@/lib/store/store";
import { sendReminders } from "@/lib/store/actions";
import { fmtDateLong, fullName, relDate } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { feedbackAbout, synthesesToWrite, teamQuotaRows } from "@/lib/store/selectors";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState } from "@/components/ui/Surface";
import { ProgressRing } from "@/components/charts/Ring";
import { useToast } from "@/components/ui/Toast";
import { FeedbackCard } from "../FeedbackCard";

export function TeamOverview() {
  const { s, me } = useSession();
  const toast = useToast();
  const router = useRouter();
  if (!me) return null;
  const rows = teamQuotaRows(s, me.id);
  const behind = rows.filter((r) => !r.quota.reached);
  return (
    <Card>
      <CardHeader
        title="Mon équipe"
        description={`${rows.length} collaborateurs · ${behind.length} sous l’objectif`}
        action={
          <span className="flex gap-2">
            {behind.length > 0 && (
              <Button size="sm" variant="secondary" onClick={() => { act((d) => sendReminders(d, me.id, "OBJECTIF", "t-rappel-objectif", behind.map((b) => b.user.id))); toast({ title: `${behind.length} rappel${behind.length > 1 ? "s" : ""} envoyé${behind.length > 1 ? "s" : ""}` }); }}>
                Relancer
              </Button>
            )}
            <Link href="/app/equipe" className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:text-accent">Suivi <ArrowRight className="size-4" /></Link>
          </span>
        }
      />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <li key={r.user.id}>
            <button type="button" onClick={() => router.push(`/app/equipe/${r.user.id}`)} className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-start transition-[border-color,background-color] duration-150 hover:border-ink/40 hover:bg-canvas focus-visible:shadow-none focus-visible:outline-2 focus-visible:outline-ink">
              <ProgressRing value={r.quota.ratio} size="2.9em" stroke={10} tone={r.quota.reached ? "success" : "ink"} label={`${r.quota.received} sur ${r.quota.target}`}>
                <span className="text-[0.7em] font-semibold tabular-nums text-ink">{r.quota.received}</span>
              </ProgressRing>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-base font-medium text-ink">{fullName(r.user)}</span>
                <span className="block truncate text-xs text-text-muted">{r.user.jobTitle}</span>
              </span>
              <Avatar user={r.user} dept={s.departments.find((d) => d.id === r.user.departmentId)} size="sm" />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function SynthesesToWrite() {
  const { s, me, open } = useSession();
  if (!me) return null;
  const todo = synthesesToWrite(s, me.id);
  return (
    <Card>
      <CardHeader title="Synthèses à rédiger" description={`Échéance : fin du cycle, le ${fmtDateLong(open.endDate)} (${relDate(s.now, open.endDate)}).`} action={<Link href="/app/syntheses" className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:text-accent">Ouvrir <ArrowRight className="size-4" /></Link>} />
      {todo.length === 0 ? (
        <EmptyState icon={FileText} title="Toutes les synthèses sont validées" className="py-6" />
      ) : (
        <ul className="divide-y divide-border">
          {todo.slice(0, 4).map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-base text-text">{fullName(u)}</span>
              <Link href={`/app/syntheses/${u.id}`} className="text-sm font-medium text-ink hover:text-accent">Rédiger</Link>
            </li>
          ))}
          {todo.length > 4 && <li className="pt-2.5 text-sm text-text-muted">+ {todo.length - 4} autres</li>}
        </ul>
      )}
    </Card>
  );
}

export function RecentTeamFeedback() {
  const { s, me, cycle } = useSession();
  if (!me) return null;
  const team = s.users.filter((u) => u.leaderIds.includes(me.id));
  const list = team.flatMap((u) => feedbackAbout(s, u.id, cycle.id, me.id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 2);
  return (
    <Card>
      <CardHeader title="Feedbacks récents sur mon équipe" />
      {list.length === 0 ? <EmptyState icon={FileText} title="Aucun feedback pour le moment" className="py-6" /> : <div className="flex flex-col gap-3">{list.map((f) => <FeedbackCard key={f.id} f={f} showRecipient compact />)}</div>}
    </Card>
  );
}

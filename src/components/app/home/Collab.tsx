"use client";
import { ArrowRight, CheckCircle2, ClipboardCheck, Inbox, Send, Target } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { fmtDay, fmtNum, relDate, daysBetween, fullName } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { feedbackAbout, finishedWithoutRequest, missionsOf, pendingTasks, quotaFor } from "@/lib/store/selectors";
import { AvatarStack } from "@/components/ui/Avatar";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState, Stagger, StaggerItem } from "@/components/ui/Surface";
import { ProgressRing } from "@/components/charts/Ring";
import { FeedbackCard } from "../FeedbackCard";
import { useShell } from "../ShellContext";

function TaskRow({ icon, title, hint, action, done }: { icon: React.ReactNode; title: React.ReactNode; hint?: React.ReactNode; action?: React.ReactNode; done?: boolean }) {
  return (
    <li className="flex items-center gap-4 py-3.5">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", done ? "bg-success-bg text-success" : "bg-paper text-ink")}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-ink">{title}</p>
        {hint && <p className="mt-0.5 text-sm text-text-secondary">{hint}</p>}
      </div>
      {action}
    </li>
  );
}

export function CollabTasks() {
  const { s, me, cycle } = useSession();
  const router = useRouter();
  const shell = useShell();
  if (!me) return null;
  const tasks = pendingTasks(s, me.id);
  const next = tasks[0];
  const q = quotaFor(s, me.id, cycle.id);
  const nudge = finishedWithoutRequest(s, me.id);
  const soon = next && daysBetween(s.now, next.request.dueDate) < 3;
  return (
    <Card data-tour="tasks">
      <CardHeader title="Vos tâches" description="Ce qui mérite votre attention aujourd’hui." />
      <ul className="divide-y divide-border">
        <TaskRow
          icon={<Inbox className="size-4" />}
          done={!tasks.length}
          title={tasks.length ? `${tasks.length} demande${tasks.length > 1 ? "s" : ""} de feedback à traiter` : "Aucune demande en attente"}
          hint={next ? (<span className={cn(soon && "font-medium text-danger")}>Prochaine échéance : {relDate(s.now, next.request.dueDate)} ({fmtDay(next.request.dueDate)})</span>) : "Vous êtes à jour."}
          action={tasks.length ? <Button size="sm" onClick={() => router.push("/app/demandes")}>Répondre</Button> : undefined}
        />
        <TaskRow
          icon={q.reached ? <CheckCircle2 className="size-4" /> : <Target className="size-4" />}
          done={q.reached}
          title={<span>Votre objectif : <span className="tabular-nums">{q.received} / {q.target}</span> feedbacks reçus</span>}
          hint={q.reached ? "Objectif atteint pour ce cycle." : q.missingDirect > 0 ? `Il vous manque ${q.missing || 1} feedback${(q.missing || 1) > 1 ? "s" : ""}, dont ${q.missingDirect} de votre responsable ou de votre équipe directe.` : `Il vous manque ${q.missing} feedback${q.missing > 1 ? "s" : ""}.`}
          action={!q.reached ? <Button size="sm" variant="secondary" onClick={() => shell.openRequest()}>Demander</Button> : undefined}
        />
        <TaskRow
          icon={q.missingGiven === 0 ? <CheckCircle2 className="size-4" /> : <Send className="size-4" />}
          done={q.missingGiven === 0}
          title={<span>Feedbacks donnés : <span className="tabular-nums">{q.given} / {q.minGiven}</span>{q.mandatory && <Badge tone="accent" className="ms-2">Obligatoire</Badge>}</span>}
          hint={q.missingGiven === 0 ? "Minimum atteint." : `Il vous reste ${q.missingGiven} feedback${q.missingGiven > 1 ? "s" : ""} à donner${q.mandatory ? " (retour obligatoire pour votre profil)" : ""}.`}
          action={q.missingGiven > 0 ? <Button size="sm" variant={q.mandatory ? "primary" : "secondary"} onClick={() => router.push("/app/feedback/nouveau")}>Donner</Button> : undefined}
        />
        <TaskRow
          icon={<ClipboardCheck className="size-4" />}
          done={!nudge.length}
          title={nudge.length ? `${nudge.length} mission${nudge.length > 1 ? "s terminées" : " terminée"} sans feedback demandé` : "Aucune mission terminée en attente"}
          hint={nudge.length ? nudge.map((m) => m.name).slice(0, 2).join(" · ") : "Pensez à demander un retour à la fin de chaque mission."}
          action={nudge.length ? <Button size="sm" variant="secondary" onClick={() => shell.openRequest({ missionId: nudge[0].id })}>Demander</Button> : undefined}
        />
      </ul>
    </Card>
  );
}

export function QuotaCard() {
  const { s, me, cycle } = useSession();
  if (!me) return null;
  const q = quotaFor(s, me.id, cycle.id);
  return (
    <Card className="flex items-center gap-5" data-tour="quota">
      <ProgressRing value={q.ratio} size="6em" tone={q.reached ? "success" : "ink"} label={`${q.received} feedbacks reçus sur ${q.target}`}>
        <span className="block text-xl font-semibold text-ink tabular-nums">{q.received}<span className="text-sm font-normal text-text-muted"> / {q.target}</span></span>
      </ProgressRing>
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-secondary">Objectif du cycle</p>
        <p className="mt-0.5 text-md font-semibold text-ink">{q.reached ? "Atteint" : `${q.missing} à recevoir`}</p>
        <p className="mt-1 text-xs text-text-muted">dont ≥ {q.directTarget} de votre responsable ou équipe directe : <span className="tabular-nums font-medium text-text">{q.fromDirectReports}</span></p>
        <p className="mt-0.5 text-xs text-text-muted">Donnés : <span className="tabular-nums font-medium text-text">{q.given} / {q.minGiven}</span>{q.mandatory && " · obligatoire"}</p>
      </div>
    </Card>
  );
}

export function GiveCard() {
  const router = useRouter();
  const shell = useShell();
  return (
    <section className="relative isolate overflow-hidden rounded-lg bg-ink p-6 text-white">
      <div aria-hidden className="pointer-events-none absolute -end-6 -top-10 -z-10 size-48 rounded-full border border-white/10" />
      <div aria-hidden className="pointer-events-none absolute -end-14 -top-16 -z-10 size-64 rounded-full border border-white/[0.07]" />
      <h2 className="font-display text-xl font-semibold tracking-[-0.01em]">Un retour, en quelques minutes.</h2>
      <p className="mt-1.5 max-w-[26em] text-sm text-white/65 text-pretty">Donnez un feedback à un collègue, avec votre nom ou de façon anonyme — ou demandez le sien à ceux qui ont travaillé avec vous.</p>
      <div className="mt-5 flex flex-wrap gap-2.5">
        <Button variant="inverse" icon={<Send className="size-4" />} onClick={() => router.push("/app/feedback/nouveau")}>
          Donner un feedback
        </Button>
        <Button variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={() => shell.openRequest()}>
          Demander un feedback
        </Button>
      </div>
    </section>
  );
}

export function RecentMissions() {
  const { s, me, cycle } = useSession();
  if (!me) return null;
  const list = missionsOf(s, me.id, cycle.id).sort((a, b) => b.startDate.localeCompare(a.startDate)).slice(0, 4);
  return (
    <Card>
      <CardHeader title="Mes missions récentes" action={<Link href="/app/missions" className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:text-accent">Tout voir <ArrowRight className="size-4" /></Link>} />
      {list.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Aucune mission pour l’instant" description="Vous verrez ici les missions auxquelles vous participez." className="py-8" />
      ) : (
        <Stagger className="grid gap-3 sm:grid-cols-2">
          {list.map((m) => (
            <StaggerItem key={m.id}>
              <Link href={`/app/missions/${m.id}`} className="block rounded-lg border border-border p-4 transition-[border-color,background-color] duration-150 hover:border-ink/40 hover:bg-canvas">
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-base font-medium text-ink">{m.name}</p>
                  <StatusPill status={m.status} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <AvatarStack users={s.users.filter((u) => m.participantIds.includes(u.id))} depts={s.departments} />
                  <span className="text-xs text-text-muted">{m.participantIds.length} participants</span>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </Card>
  );
}

export function LatestReceived() {
  const { s, me, cycle } = useSession();
  if (!me) return null;
  const list = feedbackAbout(s, me.id, cycle.id, me.id).slice(0, 2);
  return (
    <Card>
      <CardHeader title="Derniers feedbacks reçus" action={<Link href="/app/feedbacks" className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:text-accent">Tout voir <ArrowRight className="size-4" /></Link>} />
      {!s.settings.visibility.seeReceived ? (
        <p className="rounded-md bg-paper px-4 py-3 text-sm text-text-secondary">Vos feedbacks seront consultables lors de la publication de votre synthèse.</p>
      ) : list.length === 0 ? (
        <EmptyState icon={Inbox} title="Aucun feedback pour le moment" description="Demandez un retour à vos collègues pour commencer." className="py-8" />
      ) : (
        <div className="flex flex-col gap-3">{list.map((f) => <FeedbackCard key={f.id} f={f} compact />)}</div>
      )}
    </Card>
  );
}
export const _unused = { Badge, fmtNum, fullName };

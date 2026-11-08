"use client";
import { Check, MessageSquareOff } from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import { use, useMemo, useState } from "react";
import { daysBetween, fmtDay, fullName, relationLabel } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { feedbackAbout, quotaFor } from "@/lib/store/selectors";
import { useQueryState } from "@/lib/use-query-state";
import { Guard } from "@/components/app/Guard";
import { FeedbackCard } from "@/components/app/FeedbackCard";
import { ProgressRing } from "@/components/charts/Ring";
import { SynthesisView } from "@/components/synthesis/SynthesisView";
import { PersonChip } from "@/components/ui/Avatar";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { FilterBar, type FilterDef } from "@/components/ui/FilterBar";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/Surface";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";

type Tab = "feedbacks" | "synthese" | "missions" | "objectifs";

export default function CollaboratorPage({ params }: PageProps<"/app/equipe/[id]">) {
  const { id } = use(params);
  const { s, me, open } = useSession();
  const router = useRouter();
  const q = useQueryState();
  const [tab, setTab] = useState<Tab>("feedbacks");
  const [cycleId, setCycleId] = useState(open.id);
  const user = s.users.find((u) => u.id === id);
  const all = useMemo(() => (me && user ? feedbackAbout(s, user.id, open.id, me.id) : []), [s, me, user, open.id]);
  if (!me) return null;
  if (!user) return notFound();
  const f = { mission: q.get("mission"), relation: q.get("relation"), type: q.get("type"), period: q.get("period"), competency: q.get("competency") };
  const qCompId = f.competency ? s.questions.find((x) => x.competencyId === f.competency)?.id : undefined;
  const list = all.filter((x) => (!f.mission || x.missionId === f.mission) && (!f.relation || x.relation === f.relation) && (!f.type || x.kind === f.type) && (!f.period || daysBetween(x.createdAt, s.now) <= Number(f.period)) && (!f.competency || !!(qCompId && x.answers[qCompId]?.trim()) || !!x.ratings[f.competency]));
  const quota = quotaFor(s, user.id, open.id);
  const missions = s.missions.filter((m) => m.participantIds.includes(user.id) && m.cycleId === open.id);
  const sy = s.syntheses.find((x) => x.userId === user.id && x.cycleId === open.id);
  const defs: FilterDef[] = [
    { key: "mission", label: "Mission", options: missions.map((m) => ({ value: m.id, label: m.name })) },
    { key: "competency", label: "Compétence", options: s.competencies.map((c) => ({ value: c.id, label: c.name })) },
    { key: "relation", label: "Relation", options: (["RESPONSABLE", "PAIR", "EQUIPE"] as const).map((r) => ({ value: r, label: relationLabel[r] })) },
    { key: "type", label: "Type", options: [{ value: "NOMINATIF", label: "Nominatif" }, { value: "ANONYME", label: "Anonyme" }] },
    { key: "period", label: "Période", options: [{ value: "30", label: "30 derniers jours" }, { value: "90", label: "90 derniers jours" }] },
  ];
  const clear = () => q.setMany({ mission: null, relation: null, type: null, period: null, competency: null });
  return (
    <Guard action="team.view">
      {user.leaderIds.includes(me.id) ? (
        <>
          <PageHeader breadcrumb={[{ label: "Mon équipe", href: "/app/equipe" }, { label: fullName(user) }]} title={fullName(user)} description={<span className="flex flex-wrap items-center gap-3">{user.jobTitle} · {s.departments.find((d) => d.id === user.departmentId)?.name} <StatusPill status={sy?.status ?? "NON_COMMENCEE"} /></span>} actions={<Button variant="secondary" onClick={() => setTab("synthese")}>Ouvrir la synthèse</Button>} />
          <Tabs label="Collaborateur" className="mb-6" value={tab} onChange={setTab} items={[{ value: "feedbacks", label: "Feedbacks", count: all.length }, { value: "synthese", label: "Synthèse" }, { value: "missions", label: "Missions", count: missions.length }, { value: "objectifs", label: "Objectifs" }]} />
          {tab === "feedbacks" && (
            <div className="flex flex-col gap-4">
              <FilterBar defs={defs} values={f} onChange={(k, v) => q.set(k, v)} onClear={clear} />
              {all.length === 0 ? <Card><EmptyState icon={MessageSquareOff} title="Aucun feedback pour le moment" description={`${user.firstName} n’a pas encore reçu de feedback dans ce cycle.`} /></Card> : list.length === 0 ? <Card><EmptyState icon={MessageSquareOff} title="Aucun résultat avec ces filtres" action={<button type="button" className="text-sm font-medium text-ink underline underline-offset-2" onClick={clear}>Effacer les filtres</button>} /></Card> : list.map((x) => <FeedbackCard key={x.id} f={x} />)}
            </div>
          )}
          {tab === "synthese" && <SynthesisView userId={user.id} cycleId={cycleId} onCycleChange={setCycleId} />}
          {tab === "missions" && (
            <Card padded={false}>
              <ul className="divide-y divide-border">
                {missions.length === 0 && <li className="px-5 py-8 text-center text-sm text-text-muted">Aucune mission dans ce cycle.</li>}
                {missions.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => router.push(`/app/missions/${m.id}`)} className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-start transition-colors hover:bg-canvas focus-visible:shadow-none focus-visible:bg-canvas">
                      <span><span className="block text-base font-medium text-ink">{m.name}</span><span className="text-xs text-text-muted">{fmtDay(m.startDate)} → {fmtDay(m.endDate)}</span></span>
                      <Badge tone="neutral">{all.filter((x) => x.missionId === m.id).length} feedbacks</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {tab === "objectifs" && (
            <Card className="max-w-[44em]">
              <CardHeader title="Objectif du cycle" />
              <div className="flex flex-wrap items-center gap-8">
                <ProgressRing value={quota.ratio} size="8em" tone={quota.reached ? "success" : "ink"} label={`${quota.received} sur ${quota.target}`}>
                  <span className="block text-2xl font-semibold text-ink tabular-nums">{quota.received}<span className="text-sm font-normal text-text-muted"> / {quota.target}</span></span>
                </ProgressRing>
                <ul className="flex flex-col gap-3 text-base">
                  <li className="flex items-center gap-3"><Check className="size-4 text-text-muted" /> Reçus au total : <b className="tabular-nums">{quota.received}</b></li>
                  <li className="flex items-center gap-3"><Check className="size-4 text-text-muted" /> De la hiérarchie ou de l’équipe directe : <b className="tabular-nums">{quota.fromDirectReports} / {quota.directTarget}</b></li>
                  <li className="flex items-center gap-3"><StatusPill status={quota.status} /></li>
                </ul>
              </div>
              <p className="mt-5 text-xs text-text-muted">Les feedbacks anonymes comptent {s.settings.visibility.anonymousCountsInQuota ? "dans" : "hors de"} l’objectif, selon le réglage choisi par les RH.</p>
            </Card>
          )}
        </>
      ) : (
        <Card><EmptyState icon={MessageSquareOff} title="Cette personne ne fait pas partie de votre équipe" action={<PersonChip user={user} sub={null} />} /></Card>
      )}
    </Guard>
  );
}

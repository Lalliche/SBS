"use client";
import { Inbox, Info, Send } from "lucide-react";
import { useMemo } from "react";
import { daysBetween, fmtDate, fullName, relationLabel } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { feedbackAbout, sentBy } from "@/lib/store/selectors";
import { useQueryState } from "@/lib/use-query-state";
import { Guard } from "@/components/app/Guard";
import { FeedbackCard } from "@/components/app/FeedbackCard";
import { useFirstLoad } from "@/components/app/useSkeleton";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { FilterBar, type FilterDef } from "@/components/ui/FilterBar";
import { Callout, Card, EmptyState, PageHeader, Skeleton, Stagger, StaggerItem } from "@/components/ui/Surface";
import { Tabs } from "@/components/ui/Tabs";

export default function FeedbacksPage() {
  const { s, me, cycle } = useSession();
  const q = useQueryState();
  const loading = useFirstLoad();
  const tab = q.get("tab") === "envoyes" ? "envoyes" : "recus";
  const f = { mission: q.get("mission"), relation: q.get("relation"), type: q.get("type"), period: q.get("period"), competency: q.get("competency") };

  const received = useMemo(() => (me ? feedbackAbout(s, me.id, cycle.id, me.id) : []), [s, me, cycle.id]);
  const filtered = useMemo(() => {
    const qCompId = f.competency ? s.questions.find((qq) => qq.competencyId === f.competency)?.id : undefined;
    return received.filter((x) => {
      if (f.mission && x.missionId !== f.mission) return false;
      if (f.relation && x.relation !== f.relation) return false;
      if (f.type && x.kind !== f.type) return false;
      if (f.period && daysBetween(x.createdAt, s.now) > Number(f.period)) return false;
      if (f.competency && !(qCompId && x.answers[qCompId]?.trim()) && !x.ratings[f.competency]) return false;
      return true;
    });
  }, [received, f.mission, f.relation, f.type, f.period, f.competency, s]);
  const groups = useMemo(() => {
    const m = new Map<string, typeof filtered>();
    filtered.forEach((x) => m.set(x.missionId ?? "none", [...(m.get(x.missionId ?? "none") ?? []), x]));
    return [...m];
  }, [filtered]);
  if (!me) return null;
  const sent = sentBy(s, me.id, cycle.id);
  const defs: FilterDef[] = [
    { key: "mission", label: "Mission", options: [...new Set(received.map((x) => x.missionId).filter(Boolean))].map((id) => ({ value: id!, label: s.missions.find((m) => m.id === id)?.name ?? id! })) },
    { key: "competency", label: "Compétence", options: s.competencies.map((c) => ({ value: c.id, label: c.name })) },
    { key: "relation", label: "Relation", options: (["RESPONSABLE", "PAIR", "EQUIPE"] as const).map((r) => ({ value: r, label: relationLabel[r] })) },
    { key: "type", label: "Type", options: [{ value: "NOMINATIF", label: "Nominatif" }, { value: "ANONYME", label: "Anonyme" }] },
    { key: "period", label: "Période", options: [{ value: "30", label: "30 derniers jours" }, { value: "90", label: "90 derniers jours" }] },
  ];
  return (
    <Guard action="request.create">
      <PageHeader title="Mes feedbacks" description="Ce que les autres ont dit de votre contribution, et ce que vous avez donné." />
      <Tabs label="Mes feedbacks" className="mb-6" value={tab} onChange={(v) => q.set("tab", v === "recus" ? null : v)} items={[{ value: "recus", label: "Reçus", count: s.settings.visibility.seeReceived ? received.length : undefined }, { value: "envoyes", label: "Envoyés", count: sent.length }]} />
      {tab === "recus" ? (
        !s.settings.visibility.seeReceived ? (
          <Card><EmptyState icon={Info} title="Vos feedbacks ne sont pas consultables pour le moment" description="Vos feedbacks seront consultables lors de la publication de votre synthèse." /></Card>
        ) : loading ? (
          <div className="flex flex-col gap-3"><Skeleton className="h-36" /><Skeleton className="h-36" /><Skeleton className="h-36" /></div>
        ) : (
          <div className="flex flex-col gap-5">
            <FilterBar defs={defs} values={Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v]))} onChange={(k, v) => q.set(k, v)} onClear={() => q.setMany({ mission: null, relation: null, type: null, period: null, competency: null })} />
            {received.length === 0 ? (
              <Card><EmptyState icon={Inbox} title="Aucun feedback pour le moment" description="Demandez un retour à vos collègues depuis l’accueil." /></Card>
            ) : filtered.length === 0 ? (
              <Card><EmptyState icon={Inbox} title="Aucun résultat avec ces filtres" action={<button type="button" className="text-sm font-medium text-ink underline underline-offset-2" onClick={() => q.setMany({ mission: null, relation: null, type: null, period: null, competency: null })}>Effacer les filtres</button>} /></Card>
            ) : (
              groups.map(([mid, list]) => (
                <section key={mid} aria-label={s.missions.find((m) => m.id === mid)?.name ?? "Sans mission"}>
                  <h2 className="mb-3 flex items-center gap-2 text-md font-semibold text-ink">{s.missions.find((m) => m.id === mid)?.name ?? "Sans mission"} <Badge tone="neutral">{list.length}</Badge></h2>
                  <Stagger className="flex flex-col gap-3">{list.map((x) => <StaggerItem key={x.id}><FeedbackCard f={x} /></StaggerItem>)}</Stagger>
                </section>
              ))
            )}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-4">
          <Callout tone="neutral" title="Pourquoi les feedbacks anonymes ne sont-ils pas listés ?">
            Les feedbacks anonymes ne sont pas listés : personne, pas même vous, ne peut les retrouver.
          </Callout>
          {sent.length === 0 ? (
            <Card><EmptyState icon={Send} title="Aucun feedback nominatif envoyé" description="Vos envois nominatifs apparaîtront ici, en lecture seule." /></Card>
          ) : (
            <Card padded={false}>
              <ul className="divide-y divide-border">
                {sent.map((x) => {
                  const r = s.users.find((u) => u.id === x.recipientId);
                  const m = s.missions.find((mm) => mm.id === x.missionId);
                  const first = Object.values(x.answers).find((a) => a.trim());
                  return (
                    <li key={x.id} className="flex items-start gap-4 px-5 py-4">
                      {r && <Avatar user={r} dept={s.departments.find((d) => d.id === r.departmentId)} size="md" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-medium text-ink">{r ? fullName(r) : "—"} <Badge tone="neutral" className="ms-1.5">{relationLabel[x.relation]}</Badge></p>
                        <p className="text-xs text-text-muted">{m?.name ?? "Sans mission"} · {fmtDate(x.createdAt)}</p>
                        {first && <p className="mt-1.5 line-clamp-2 text-sm text-text-secondary">{first}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      )}
    </Guard>
  );
}

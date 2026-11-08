"use client";
import { Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { act } from "@/lib/store/store";
import { sendReminders } from "@/lib/store/actions";
import { fmtDate } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { teamQuotaRows } from "@/lib/store/selectors";
import { Guard } from "@/components/app/Guard";
import { Kpi } from "@/components/app/Kpi";
import { ProgressRing } from "@/components/charts/Ring";
import { PersonChip } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, SavedViews } from "@/components/ui/DataTable";
import { EmptyState, PageHeader } from "@/components/ui/Surface";
import { useToast } from "@/components/ui/Toast";

type Row = ReturnType<typeof teamQuotaRows>[number];

export default function EquipePage() {
  const { s, me } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = useState<"all" | "behind" | "synth">("all");
  const rows = useMemo(() => (me ? teamQuotaRows(s, me.id) : []), [s, me]);
  if (!me) return null;
  const shown = rows.filter((r) => (view === "behind" ? !r.quota.reached : view === "synth" ? r.synthesis !== "VALIDEE" : true));
  const remind = (list: Row[]) => {
    act((d) => sendReminders(d, me.id, "OBJECTIF", "t-rappel-objectif", list.map((r) => r.user.id)));
    toast({ title: `${list.length} rappel${list.length > 1 ? "s" : ""} envoyé${list.length > 1 ? "s" : ""}` });
  };
  return (
    <Guard action="team.view">
      <PageHeader title="Mon équipe" description="Les feedbacks reçus par chacun de vos collaborateurs, et leur avancement vers l’objectif." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Kpi label="Feedbacks reçus" value={rows.reduce((n, r) => n + r.quota.received, 0)} hint="par l’ensemble de l’équipe" />
        <Kpi label="Objectifs atteints" value={rows.filter((r) => r.quota.reached).length} hint={`sur ${rows.length} collaborateurs`} />
        <Kpi label="Synthèses validées" value={rows.filter((r) => r.synthesis === "VALIDEE").length} hint={`sur ${rows.length}`} />
      </div>
      <SavedViews value={view} onChange={setView} views={[{ value: "all", label: "Tous", count: rows.length }, { value: "behind", label: "Sous l’objectif", count: rows.filter((r) => !r.quota.reached).length }, { value: "synth", label: "Synthèse à rédiger", count: rows.filter((r) => r.synthesis !== "VALIDEE").length }]} />
      <DataTable<Row>
        caption="Suivi de l’équipe"
        rows={shown}
        getId={(r) => r.user.id}
        selectable
        onRowClick={(r) => router.push(`/app/equipe/${r.user.id}`)}
        bulk={(sel, clear) => <Button size="sm" variant="inverse" onClick={() => { remind(sel); clear(); }}>Relancer</Button>}
        empty={<EmptyState icon={Users} title="Aucun collaborateur dans cette vue" />}
        columns={[
          { key: "p", header: "Collaborateur", sort: (a, b) => a.user.lastName.localeCompare(b.user.lastName), cell: (r) => <PersonChip user={r.user} dept={s.departments.find((d) => d.id === r.user.departmentId)} /> },
          { key: "m", header: "Missions", align: "end", hideBelow: "md", sort: (a, b) => a.missions - b.missions, cell: (r) => r.missions },
          { key: "f", header: "Feedbacks reçus", align: "end", sort: (a, b) => a.quota.received - b.quota.received, cell: (r) => r.quota.received },
          { key: "o", header: "Objectif", cell: (r) => <span className="flex items-center gap-2.5"><ProgressRing value={r.quota.ratio} size="2.1em" stroke={12} tone={r.quota.reached ? "success" : "ink"} label={`${r.quota.received} sur ${r.quota.target}`} /> <span className="tabular-nums text-text-secondary">{r.quota.received} / {r.quota.target}</span> <StatusPill status={r.quota.status} /></span> },
          { key: "l", header: "Dernier feedback", hideBelow: "lg", sort: (a, b) => (a.last ?? "").localeCompare(b.last ?? ""), cell: (r) => <span className="text-text-secondary">{r.last ? fmtDate(r.last) : "—"}</span> },
          { key: "s", header: "Synthèse", cell: (r) => <StatusPill status={r.synthesis} /> },
        ]}
      />
    </Guard>
  );
}

"use client";
import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fmtDate, fullName } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { directReports } from "@/lib/store/selectors";
import { Guard } from "@/components/app/Guard";
import { PersonChip } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, SavedViews } from "@/components/ui/DataTable";
import { EmptyState, PageHeader } from "@/components/ui/Surface";
import type { User } from "@/lib/store/types";

export default function SynthesesPage() {
  const { s, me, open } = useSession();
  const router = useRouter();
  const [view, setView] = useState<"all" | "todo" | "done">("all");
  if (!me) return null;
  const team = directReports(s, me.id);
  const st = (u: User) => s.syntheses.find((x) => x.userId === u.id && x.cycleId === open.id);
  const rows = team.filter((u) => (view === "all" ? true : view === "done" ? st(u)?.status === "VALIDEE" : st(u)?.status !== "VALIDEE"));
  return (
    <Guard action="synthesis.write">
      <PageHeader title="Synthèses" description={`Rédigez la synthèse de fin d’année de votre équipe — cycle ${open.name}.`} />
      <SavedViews value={view} onChange={setView} views={[{ value: "all", label: "Toutes", count: team.length }, { value: "todo", label: "À rédiger", count: team.filter((u) => st(u)?.status !== "VALIDEE").length }, { value: "done", label: "Validées", count: team.filter((u) => st(u)?.status === "VALIDEE").length }]} />
      <DataTable<User>
        caption="Synthèses de l’équipe"
        rows={rows}
        getId={(u) => u.id}
        onRowClick={(u) => router.push(`/app/syntheses/${u.id}`)}
        empty={<EmptyState icon={FileText} title="Aucune synthèse dans cette vue" />}
        columns={[
          { key: "p", header: "Collaborateur", sort: (a, b) => a.lastName.localeCompare(b.lastName), cell: (u) => <PersonChip user={u} dept={s.departments.find((d) => d.id === u.departmentId)} /> },
          { key: "s", header: "Statut", cell: (u) => <StatusPill status={st(u)?.status ?? "NON_COMMENCEE"} /> },
          { key: "i", header: "Points forts / axes", hideBelow: "md", cell: (u) => <span className="text-text-secondary tabular-nums">{st(u)?.strengths.length ?? 0} / {st(u)?.axes.length ?? 0}</span> },
          { key: "v", header: "Validée le", hideBelow: "md", cell: (u) => <span className="text-text-secondary">{st(u)?.validatedAt ? fmtDate(st(u)!.validatedAt!) : "—"}</span> },
        ]}
        rowActions={(u) => <Button size="sm" variant="secondary" onClick={() => router.push(`/app/syntheses/${u.id}`)}>{st(u)?.status === "VALIDEE" ? "Consulter" : "Rédiger"}</Button>}
      />
      <span className="hidden">{fullName(me)}</span>
    </Guard>
  );
}

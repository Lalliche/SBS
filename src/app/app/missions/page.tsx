"use client";
import { ClipboardList, MoreHorizontal, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { fmtDay, fmtDate, fullName } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { missionFeedbackCount, missionsOf } from "@/lib/store/selectors";
import type { Mission } from "@/lib/store/types";
import { useShell } from "@/components/app/ShellContext";
import { Guard } from "@/components/app/Guard";
import { AvatarStack } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { SearchInput } from "@/components/ui/FormInputs";
import { Popover, MenuItem } from "@/components/ui/Popover";
import { EmptyState, PageHeader } from "@/components/ui/Surface";
import { Tabs } from "@/components/ui/Tabs";
import { useFirstLoad } from "@/components/app/useSkeleton";
import { Skeleton } from "@/components/ui/Surface";

export default function MissionsPage() {
  const { s, me, can, cycle, readOnly } = useSession();
  const router = useRouter();
  const shell = useShell();
  const loading = useFirstLoad();
  const [tab, setTab] = useState<"EN_COURS" | "TERMINEE">("EN_COURS");
  const [q, setQ] = useState("");
  const all = useMemo(() => (me ? missionsOf(s, me.id, cycle.id) : []), [s, me, cycle.id]);
  const rows = all.filter((m) => m.status === tab && `${m.name} ${m.otp} ${m.client ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));
  if (!me) return null;
  const canCreate = can("mission.create");
  return (
    <Guard action="feedback.give">
      <PageHeader title="Mes missions" description="Les missions que vous pilotez ou auxquelles vous participez. Chacun peut ajouter une mission ; les responsables les pilotent." actions={canCreate && !readOnly ? <Button icon={<Plus className="size-4" />} onClick={shell.openMission}>Nouvelle mission</Button> : undefined} />
      <Tabs label="Statut" className="mb-4" value={tab} onChange={setTab} items={[{ value: "EN_COURS", label: "En cours", count: all.filter((m) => m.status === "EN_COURS").length }, { value: "TERMINEE", label: "Terminées", count: all.filter((m) => m.status === "TERMINEE").length }]} />
      {loading ? (
        <div className="flex flex-col gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-11" />)}</div>
      ) : (
        <DataTable<Mission>
          caption="Missions"
          rows={rows}
          getId={(m) => m.id}
          onRowClick={(m) => router.push(`/app/missions/${m.id}`)}
          toolbar={<SearchInput value={q} onChange={setQ} placeholder="Rechercher par mission, client ou OTP…" className="w-[20em]" />}
          empty={<EmptyState icon={ClipboardList} title={q ? "Aucune mission ne correspond" : tab === "EN_COURS" ? "Aucune mission en cours" : "Aucune mission terminée"} description={q ? undefined : "Une mission rattache les feedbacks au travail réalisé."} action={!q && canCreate ? <Button onClick={shell.openMission}>Créer la première mission</Button> : undefined} />}
          defaultSort={{ key: "dates", dir: "desc" }}
          columns={[
            { key: "name", header: "Mission", sort: (a, b) => a.name.localeCompare(b.name), cell: (m) => <span className="font-medium text-ink">{m.name}{m.client && <span className="block text-xs font-normal text-text-muted">{m.client}</span>}</span> },
            { key: "otp", header: "OTP", hideBelow: "md", sort: (a, b) => a.otp.localeCompare(b.otp), cell: (m) => <span className="font-mono text-xs text-text-secondary">{m.otp || "—"}</span> },
            { key: "lead", header: "Responsable", hideBelow: "md", cell: (m) => { const l = s.users.find((u) => u.id === m.leadId); return l ? fullName(l) : "—"; } },
            { key: "people", header: "Participants", hideBelow: "lg", cell: (m) => <AvatarStack users={s.users.filter((u) => m.participantIds.includes(u.id))} depts={s.departments} /> },
            { key: "dates", header: "Dates", hideBelow: "lg", sort: (a, b) => a.startDate.localeCompare(b.startDate), cell: (m) => <span className="text-text-secondary">{fmtDay(m.startDate)} → {fmtDate(m.endDate)}</span> },
            { key: "h", header: "Heures", align: "end", hideBelow: "lg", sort: (a, b) => a.hours - b.hours, cell: (m) => (m.hours ? `${m.hours} h` : "—") },
            { key: "fb", header: "Feedbacks", align: "end", sort: (a, b) => missionFeedbackCount(s, a.id) - missionFeedbackCount(s, b.id), cell: (m) => missionFeedbackCount(s, m.id) },
            { key: "status", header: "Statut", cell: (m) => <StatusPill status={m.status} /> },
          ]}
          rowActions={(m) => (
            <Popover label="Actions" trigger={({ toggle, ref }) => <IconButton ref={ref} label="Actions" size="sm" onClick={toggle}><MoreHorizontal className="size-4" /></IconButton>}>
              {(close) => (
                <div role="menu" className="min-w-[13em] py-1">
                  <MenuItem onClick={() => { close(); router.push(`/app/missions/${m.id}`); }}>Ouvrir</MenuItem>
                  {m.participantIds.includes(me.id) && <MenuItem disabled={readOnly} onClick={() => { close(); shell.openRequest({ missionId: m.id }); }}>Demander un feedback</MenuItem>}
                </div>
              )}
            </Popover>
          )}
        />
      )}
    </Guard>
  );
}

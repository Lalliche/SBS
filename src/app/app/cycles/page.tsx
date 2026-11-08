"use client";
import { Archive, CalendarRange, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { act } from "@/lib/store/store";
import { createCycle } from "@/lib/store/actions";
import { fmtDate } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import type { Cycle } from "@/lib/store/types";
import { Guard } from "@/components/app/Guard";
import { StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Field, TextInput } from "@/components/ui/FormInputs";
import { Drawer } from "@/components/ui/Overlay";
import { Callout, EmptyState, PageHeader } from "@/components/ui/Surface";
import { useToast } from "@/components/ui/Toast";

export default function CyclesPage() {
  const { s, me } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  if (!me) return null;
  const overlap = s.cycles.find((c) => start && end && c.status !== "ARCHIVE" && start <= c.endDate.slice(0, 10) && end >= c.startDate.slice(0, 10));
  const kpi = (c: Cycle) => ({ fb: s.named.filter((f) => f.cycleId === c.id).length + s.anonymous.filter((f) => f.cycleId === c.id).length, sy: s.syntheses.filter((x) => x.cycleId === c.id && x.status === "VALIDEE").length });
  const valid = name.trim() && start && end && end > start;
  return (
    <Guard action="cycle.manage">
      <PageHeader title="Cycles" description="L’année de feedback : ouverture, objectifs, rappels, archivage automatique." actions={<Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>Nouveau cycle</Button>} />
      <DataTable<Cycle>
        caption="Cycles"
        rows={[...s.cycles].sort((a, b) => b.startDate.localeCompare(a.startDate))}
        getId={(c) => c.id}
        onRowClick={(c) => router.push(`/app/cycles/${c.id}`)}
        pageSize={10}
        empty={<EmptyState icon={CalendarRange} title="Aucun cycle" description="Ouvrez le premier cycle de l’année." action={<Button onClick={() => setOpen(true)}>Créer le premier cycle</Button>} />}
        columns={[
          { key: "n", header: "Cycle", cell: (c) => <span className="font-medium text-ink">{c.name}</span> },
          { key: "st", header: "Statut", cell: (c) => <StatusPill status={c.status} /> },
          { key: "d", header: "Période", hideBelow: "md", cell: (c) => <span className="text-text-secondary">{fmtDate(c.startDate)} → {fmtDate(c.endDate)}</span> },
          { key: "f", header: "Feedbacks", align: "end", cell: (c) => kpi(c).fb },
          { key: "y", header: "Synthèses validées", align: "end", hideBelow: "md", cell: (c) => kpi(c).sy },
        ]}
        rowActions={(c) => <Button size="sm" variant="secondary" icon={c.status === "ARCHIVE" ? <Archive className="size-4" /> : undefined} onClick={() => router.push(`/app/cycles/${c.id}`)}>{c.status === "ARCHIVE" ? "Ouvrir" : "Gérer"}</Button>}
      />
      <Drawer open={open} onClose={() => setOpen(false)} title="Nouveau cycle" subtitle="Les cycles s’archivent automatiquement à leur date de fin." dirty={!!(name || start || end)} footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button disabled={!valid} onClick={() => { act((d) => createCycle(d, me.id, name.trim(), new Date(start + "T00:00:00Z").toISOString(), new Date(end + "T23:59:59Z").toISOString())); setOpen(false); setName(""); setStart(""); setEnd(""); toast({ title: "Cycle créé" }); }}>Créer le cycle</Button></>}>
        <div className="flex flex-col gap-5">
          <TextInput label="Nom" required value={name} onChange={setName} placeholder="Ex. FY29" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Début" required><input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 w-full rounded-md border border-border-strong bg-bg px-3 text-base focus-visible:outline-none focus-visible:border-ink" /></Field>
            <Field label="Fin" required><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 w-full rounded-md border border-border-strong bg-bg px-3 text-base focus-visible:outline-none focus-visible:border-ink" /></Field>
          </div>
          {overlap && <Callout tone="warning" title="Chevauchement">Ces dates chevauchent le cycle {overlap.name}. Un seul cycle peut être ouvert à la fois.</Callout>}
          {!valid && name && <p className="text-xs text-text-muted">Renseignez des dates valides (la fin doit suivre le début).</p>}
        </div>
      </Drawer>
    </Guard>
  );
}

"use client";
import { Download, History, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { fmtDate, fullName } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import type { AdminCategory, AdminEvent } from "@/lib/store/types";
import { Guard } from "@/components/app/Guard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { SearchInput, SelectInput } from "@/components/ui/FormInputs";
import { Drawer, Modal } from "@/components/ui/Overlay";
import { Callout, EmptyState, PageHeader } from "@/components/ui/Surface";
import { useToast } from "@/components/ui/Toast";

const CATS: AdminCategory[] = ["Cycles", "Missions", "Questions", "Liens client", "Collaborateurs", "Paramètres", "Sécurité", "Feedbacks"];

export default function JournalPage() {
  const { s, me } = useSession();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [actor, setActor] = useState("");
  const [sel, setSel] = useState<AdminEvent | null>(null);
  const [exp, setExp] = useState(false);
  const rows = useMemo(() => s.adminEvents.filter((e) => (!cat || e.category === cat) && (!actor || (actor === "none" ? !e.actorId : e.actorId === actor)) && `${e.action} ${e.target}`.toLowerCase().includes(q.toLowerCase())), [s.adminEvents, q, cat, actor]);
  if (!me) return null;
  const actors = [...new Set(s.adminEvents.map((e) => e.actorId).filter(Boolean))] as string[];
  return (
    <Guard action="journal.view">
      <PageHeader title="Journal d’administration" description="Les actions d’administration, dans l’ordre." actions={<Button variant="secondary" icon={<Download className="size-4" />} onClick={() => setExp(true)}>Exporter</Button>} />
      <Callout tone="info" className="mb-5" title="Ce journal n’enregistre jamais l’auteur d’un feedback anonyme.">Un envoi anonyme apparaît sans acteur : « Un feedback anonyme a été envoyé ».</Callout>
      <DataTable<AdminEvent>
        caption="Journal d’administration"
        rows={rows}
        getId={(e) => e.id}
        onRowClick={setSel}
        defaultSort={{ key: "ts", dir: "desc" }}
        toolbar={<><SearchInput value={q} onChange={setQ} className="w-[18em]" placeholder="Rechercher…" /><select aria-label="Catégorie" value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 rounded-md border border-border-strong bg-bg px-2 text-sm"><option value="">Toutes les catégories</option>{CATS.map((c) => <option key={c}>{c}</option>)}</select><select aria-label="Acteur" value={actor} onChange={(e) => setActor(e.target.value)} className="h-9 rounded-md border border-border-strong bg-bg px-2 text-sm"><option value="">Tous les acteurs</option><option value="none">Aucun acteur (envois anonymes)</option>{actors.map((id) => <option key={id} value={id}>{fullName(s.users.find((u) => u.id === id)!)}</option>)}</select></>}
        empty={<EmptyState icon={History} title="Aucun événement" />}
        columns={[
          { key: "ts", header: "Date", sort: (a, b) => a.ts.localeCompare(b.ts), cell: (e) => <span className="tabular-nums text-text-secondary">{fmtDate(e.ts)}</span> },
          { key: "c", header: "Catégorie", cell: (e) => <Badge tone={e.category === "Sécurité" ? "danger" : e.category === "Feedbacks" ? "ink" : "neutral"}>{e.category}</Badge> },
          { key: "a", header: "Action", cell: (e) => <span className="font-medium text-ink">{e.action}</span> },
          { key: "u", header: "Acteur", hideBelow: "md", cell: (e) => (e.actorId ? fullName(s.users.find((u) => u.id === e.actorId) ?? { firstName: "—", lastName: "" }) : <span className="inline-flex items-center gap-1.5 text-text-muted"><ShieldCheck className="size-3.5" /> Aucun acteur</span>) },
          { key: "t", header: "Cible", hideBelow: "lg", cell: (e) => <span className="line-clamp-1 text-text-secondary">{e.target}</span> },
        ]}
      />
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel?.action ?? ""} subtitle={sel ? `${fmtDate(sel.ts)} · ${sel.category}` : ""}>
        {sel && <div className="flex flex-col gap-5"><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-xs text-text-muted">Acteur</dt><dd className="mt-0.5 font-medium text-ink">{sel.actorId ? fullName(s.users.find((u) => u.id === sel.actorId)!) : "Aucun (par conception)"}</dd></div><div><dt className="text-xs text-text-muted">Cible</dt><dd className="mt-0.5 font-medium text-ink">{sel.target}</dd></div></dl>
          {sel.details ? <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-danger/20 bg-danger-bg p-3"><p className="mb-1 text-xs font-semibold text-danger">Avant</p><p className="text-sm text-text">{sel.details.before}</p></div><div className="rounded-lg border border-success/20 bg-success-bg p-3"><p className="mb-1 text-xs font-semibold text-success">Après</p><p className="text-sm text-text">{sel.details.after}</p></div></div> : <p className="text-sm text-text-muted">Aucune différence de configuration associée.</p>}</div>}
      </Drawer>
      <Modal open={exp} onClose={() => setExp(false)} title="Exporter le journal" footer={<><Button variant="ghost" onClick={() => setExp(false)}>Annuler</Button><Button onClick={() => { setExp(false); toast({ title: "Export CSV prêt", body: `${rows.length} ligne(s)` }); }}>Exporter en CSV</Button></>}>
        <SelectInput label="Période" value="all" onChange={() => {}} options={[{ value: "all", label: "Tout le journal" }]} /><p className="mt-3 text-sm text-text-secondary">{rows.length} événement(s) avec les filtres actuels.</p>
      </Modal>
    </Guard>
  );
}

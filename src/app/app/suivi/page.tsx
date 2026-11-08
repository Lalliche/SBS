"use client";
import { Send } from "lucide-react";
import { useMemo, useState } from "react";
import { act } from "@/lib/store/store";
import { sendReminders, toggleReminderRule } from "@/lib/store/actions";
import { fmtDate, fullName, relDate } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { activeUsers, feedbackSeries, participationByDepartment, quotaFor } from "@/lib/store/selectors";
import type { User } from "@/lib/store/types";
import { Guard } from "@/components/app/Guard";
import { BarList } from "@/components/charts/BarList";
import { LineChart } from "@/components/charts/LineChart";
import { ProgressRing } from "@/components/charts/Ring";
import { PersonChip } from "@/components/ui/Avatar";
import { StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, SavedViews } from "@/components/ui/DataTable";
import { SelectInput, Switch } from "@/components/ui/FormInputs";
import { Modal } from "@/components/ui/Overlay";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/Surface";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { Users } from "lucide-react";

type Tab = "participation" | "objectifs" | "rappels";
type Row = { user: User; q: ReturnType<typeof quotaFor> };

export default function SuiviPage() {
  const { s, me, open } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("participation");
  const [view, setView] = useState<"all" | "late" | "leaders" | "dept">("all");
  const [dept, setDept] = useState("");
  const [modal, setModal] = useState(false);
  const [aud, setAud] = useState<"OBJECTIF" | "DEMANDES" | "RESPONSABLES">("OBJECTIF");
  const [tpl, setTpl] = useState("t-rappel-objectif");
  const rows = useMemo<Row[]>(() => activeUsers(s).filter((u) => u.role !== "ADMIN_TECH").map((u) => ({ user: u, q: quotaFor(s, u.id, open.id) })), [s, open.id]);
  if (!me) return null;
  const series = feedbackSeries(s, open.id, 12);
  const byDept = participationByDepartment(s);
  const grades = ["Junior", "Consultant", "Senior", "Manager", "Directeur"].map((g) => { const p = rows.filter((r) => r.user.grade === g); const ok = p.filter((r) => r.q.reached).length; return { id: g, label: g, sub: `${ok}/${p.length}`, value: p.length ? ok / p.length : 0, display: `${p.length ? Math.round((ok / p.length) * 100) : 0} %` }; }).filter((x) => x.sub !== "0/0");
  const shown = rows.filter((r) => (view === "late" ? !r.q.reached : view === "leaders" ? r.user.role === "RESPONSABLE" : view === "dept" ? (dept ? r.user.departmentId === dept : true) : true));
  const audience = () => (aud === "OBJECTIF" ? rows.filter((r) => !r.q.reached).map((r) => r.user.id) : aud === "DEMANDES" ? [...new Set(s.tasks.filter((t) => t.status === "EN_ATTENTE").map((t) => t.giverId))] : s.users.filter((u) => u.role === "RESPONSABLE").map((u) => u.id));
  return (
    <Guard action="follow.view">
      <PageHeader title="Suivi & rappels" description="Participation du cycle, objectifs individuels et relances." actions={<Button icon={<Send className="size-4" />} onClick={() => setModal(true)}>Envoyer un rappel maintenant</Button>} />
      <Tabs label="Suivi" className="mb-6" value={tab} onChange={setTab} items={[{ value: "participation", label: "Participation" }, { value: "objectifs", label: "Objectifs", count: rows.filter((r) => !r.q.reached).length }, { value: "rappels", label: "Rappels" }]} />
      {tab === "participation" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="xl:col-span-2"><CardHeader title="Feedbacks dans le cycle" description="Nominatifs et anonymes, par semaine." /><LineChart labels={series.map((x) => x.label)} series={[{ id: "n", label: "Nominatifs", values: series.map((x) => x.named), color: "var(--color-ink)", marker: "circle" }, { id: "a", label: "Anonymes", values: series.map((x) => x.anonymous), color: "var(--color-series-team)", dash: "6 4", marker: "square" }]} /></Card>
          <Card><CardHeader title="Objectifs atteints par département" /><BarList rows={byDept.map((d) => ({ id: d.department.id, label: d.department.name, sub: `${d.reached}/${d.people}`, value: d.ratio, display: `${Math.round(d.ratio * 100)} %` }))} /></Card>
          <Card><CardHeader title="Objectifs atteints par grade" /><BarList rows={grades} /></Card>
        </div>
      )}
      {tab === "objectifs" && (
        <>
          <SavedViews value={view} onChange={setView} views={[{ value: "all", label: "Tous", count: rows.length }, { value: "late", label: "En retard", count: rows.filter((r) => !r.q.reached).length }, { value: "leaders", label: "Responsables", count: rows.filter((r) => r.user.role === "RESPONSABLE").length }, { value: "dept", label: "Par département" }]} />
          {view === "dept" && <div className="mb-3 max-w-[18em]"><SelectInput label="Département" value={dept} onChange={setDept} options={[{ value: "", label: "Tous" }, ...s.departments.map((d) => ({ value: d.id, label: d.name }))]} /></div>}
          <DataTable<Row>
            caption="Objectifs de feedback"
            rows={shown}
            getId={(r) => r.user.id}
            selectable
            bulk={(sel, clear) => <Button size="sm" variant="inverse" onClick={() => { act((d) => sendReminders(d, me.id, "OBJECTIF", "t-rappel-objectif", sel.map((r) => r.user.id))); toast({ title: `${sel.length} rappel${sel.length > 1 ? "s" : ""} envoyé${sel.length > 1 ? "s" : ""}` }); clear(); }}>Relancer</Button>}
            empty={<EmptyState icon={Users} title="Personne dans cette vue" />}
            columns={[
              { key: "p", header: "Collaborateur", sort: (a, b) => a.user.lastName.localeCompare(b.user.lastName), cell: (r) => <PersonChip user={r.user} dept={s.departments.find((d) => d.id === r.user.departmentId)} /> },
              { key: "r", header: "Objectif", cell: (r) => <span className="flex items-center gap-2.5"><ProgressRing value={r.q.ratio} size="2.1em" stroke={12} tone={r.q.reached ? "success" : "ink"} label={`${r.q.received} sur ${r.q.target}`} /><span className="tabular-nums text-text-secondary">{r.q.received} / {r.q.target}</span></span> },
              { key: "rc", header: "Reçus", align: "end", sort: (a, b) => a.q.received - b.q.received, cell: (r) => r.q.received },
              { key: "d", header: "De l’entourage direct", align: "end", hideBelow: "md", cell: (r) => r.q.fromDirectReports },
              { key: "s", header: "Statut", cell: (r) => <StatusPill status={r.q.status} /> },
            ]}
          />
        </>
      )}
      {tab === "rappels" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <Card>
            <CardHeader title="Règles actives" />
            <ul className="divide-y divide-border">
              {open.reminderRules.map((r) => (
                <li key={r.id} className="flex items-center gap-4 py-3.5"><div className="flex-1"><p className="text-base font-medium text-ink">{r.label}</p><p className="text-xs text-text-muted">{r.cadence === "HEBDOMADAIRE" ? "Chaque semaine" : r.cadence === "MENSUEL" ? "Chaque mois" : "30 jours avant la fin"} · {r.enabled ? (r.lastRun ? `prochain envoi ${relDate(s.now, new Date(new Date(r.lastRun).getTime() + (r.cadence === "HEBDOMADAIRE" ? 7 : 30) * 86400000).toISOString())}` : "au prochain passage") : "désactivée"}</p></div><Switch checked={r.enabled} onChange={(v) => act((d) => toggleReminderRule(d, me.id, open.id, r.id, v))} label={r.label} /></li>
              ))}
            </ul>
          </Card>
          <Card padded={false}>
            <div className="border-b border-border px-5 py-4"><h2 className="text-md font-semibold text-ink">Historique des envois</h2></div>
            <table className="w-full text-base"><thead className="bg-canvas text-xs uppercase tracking-[0.06em] text-text-muted"><tr><th className="px-5 py-2.5 text-start">Date</th><th className="text-start">Modèle</th><th className="text-end">Destinataires</th><th className="px-5 text-end">Lus</th></tr></thead>
              <tbody>{s.emailSends.map((e) => <tr key={e.id} className="border-t border-border"><td className="px-5 py-2.5 text-text-secondary">{fmtDate(e.ts)}</td><td>{s.templates.find((t) => t.id === e.templateId)?.name ?? e.templateId}</td><td className="text-end tabular-nums">{e.recipients}</td><td className="px-5 text-end tabular-nums text-text-secondary">{e.opened}/{e.delivered}</td></tr>)}</tbody></table>
          </Card>
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} size="lg" title="Envoyer un rappel maintenant" subtitle="Choisissez l’audience et le modèle." footer={<><Button variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button disabled={!audience().length} onClick={() => { const n = act((d) => sendReminders(d, me.id, aud, tpl, audience())); setModal(false); toast({ title: `${n} rappel${n > 1 ? "s" : ""} envoyé${n > 1 ? "s" : ""}` }); }}>Envoyer {audience().length} rappel{audience().length > 1 ? "s" : ""}</Button></>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput label="Audience" value={aud} onChange={(v) => { setAud(v); setTpl(v === "DEMANDES" ? "t-rappel-demande" : "t-rappel-objectif"); }} options={[{ value: "OBJECTIF", label: "Collaborateurs sous l’objectif" }, { value: "DEMANDES", label: "Personnes avec des demandes en attente" }, { value: "RESPONSABLES", label: "Responsables d’équipe" }]} />
          <SelectInput label="Modèle" value={tpl} onChange={setTpl} options={s.templates.map((t) => ({ value: t.id, label: t.name }))} />
        </div>
        <div className="mt-4 rounded-lg border border-border bg-canvas p-4 text-sm"><p className="font-semibold text-ink">{s.templates.find((t) => t.id === tpl)?.subject.replace(/\{\{[^}]+\}\}/g, "…")}</p><p className="mt-2 whitespace-pre-line text-text-secondary">{s.templates.find((t) => t.id === tpl)?.body.replace(/\{\{prenom\}\}/g, "Prénom").replace(/\{\{[^}]+\}\}/g, "…")}</p></div>
        <p className="mt-3 text-sm text-text-secondary">Destinataires : <b className="tabular-nums">{audience().length}</b> ({audience().slice(0, 3).map((id) => fullName(s.users.find((u) => u.id === id)!)).join(", ")}{audience().length > 3 ? "…" : ""})</p>
      </Modal>
    </Guard>
  );
}

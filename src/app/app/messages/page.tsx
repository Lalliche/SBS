"use client";
import { Mail, Monitor, Smartphone } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { act } from "@/lib/store/store";
import { updateTemplate } from "@/lib/store/actions";
import { fmtDate } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import type { EmailSend, NotificationKind } from "@/lib/store/types";
import { Guard } from "@/components/app/Guard";
import { NotificationItems } from "@/components/app/NotificationsPopover";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SegmentedControl, TextArea, TextInput } from "@/components/ui/FormInputs";
import { Drawer } from "@/components/ui/Overlay";
import { Card, PageHeader } from "@/components/ui/Surface";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { markAllRead } from "@/lib/store/actions";

type Tab = "notifications" | "modeles" | "historique";
const VARS = ["{{prenom}}", "{{mission}}", "{{date_limite}}", "{{lien}}"];

export default function MessagesPage() {
  const { s, me } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("notifications");
  const [filter, setFilter] = useState<"all" | "unread" | NotificationKind>("all");
  const [tplId, setTplId] = useState(s.templates[0].id);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [sendRow, setSendRow] = useState<EmailSend | null>(null);
  const tpl = s.templates.find((t) => t.id === tplId)!;
  const [subject, setSubject] = useState(tpl.subject);
  const [body, setBody] = useState(tpl.body);
  const dirty = subject !== tpl.subject || body !== tpl.body;
  if (!me) return null;
  const pick = (id: string) => { const t = s.templates.find((x) => x.id === id)!; setTplId(id); setSubject(t.subject); setBody(t.body); };
  const sample = (t: string) => t.replace(/\{\{prenom\}\}/g, "Claire").replace(/\{\{mission\}\}/g, "Schéma directeur de transformation").replace(/\{\{date_limite\}\}/g, "20 nov. 2026").replace(/\{\{lien\}\}/g, "sbs360.example/app");
  return (
    <Guard action="messages.manage">
      <PageHeader title="Messages" description="Notifications, modèles d’e-mail et historique des envois." />
      <Tabs label="Messages" className="mb-6" value={tab} onChange={setTab} items={[{ value: "notifications", label: "Notifications" }, { value: "modeles", label: "Modèles d’e-mail", count: s.templates.length }, { value: "historique", label: "Historique" }]} />
      {tab === "notifications" && (
        <Card padded={false}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
            <div className="flex flex-wrap gap-1.5">{([["all", "Toutes"], ["unread", "Non lues"], ["DEMANDE", "Demandes"], ["RAPPEL", "Rappels"], ["SYNTHESE", "Synthèses"], ["SYSTEME", "Système"]] as const).map(([v, l]) => <button key={v} type="button" onClick={() => setFilter(v)} className={cn("rounded-full border px-3 py-1 text-sm font-medium", filter === v ? "border-ink bg-ink text-white" : "border-border-strong text-text-secondary hover:border-ink/40")}>{l}</button>)}</div>
            <Button size="sm" variant="secondary" onClick={() => act((d) => markAllRead(d, me.id))}>Tout marquer comme lu</Button>
          </div>
          <FilteredNotifications filter={filter} />
        </Card>
      )}
      {tab === "modeles" && (
        <div className="grid gap-6 xl:grid-cols-[16em_1fr]">
          <ul className="flex flex-col gap-1">{s.templates.map((t) => <li key={t.id}><button type="button" onClick={() => pick(t.id)} className={cn("flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-start text-base transition-colors focus-visible:shadow-none focus-visible:ring-2 focus-visible:ring-ink", t.id === tplId ? "bg-bg font-semibold text-ink shadow-xs" : "text-text-secondary hover:bg-bg")}><Mail className="size-4" />{t.name}</button></li>)}</ul>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card><div className="flex flex-col gap-4"><TextInput label="Objet" value={subject} onChange={setSubject} /><TextArea label="Corps du message" value={body} onChange={setBody} rows={9} /><div><p className="mb-1.5 text-xs font-medium text-text-muted">Variables</p><div className="flex flex-wrap gap-1.5">{VARS.map((v) => <button key={v} type="button" onClick={() => setBody(body + " " + v)} className="rounded-full border border-border-strong bg-canvas px-2.5 py-1 font-mono text-xs text-text hover:border-ink/50">{v}</button>)}</div></div>
              <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4"><span className="flex gap-2"><Button variant="ghost" onClick={() => pick(tplId)}>Réinitialiser</Button><Button variant="secondary" onClick={() => toast({ title: "E-mail de test envoyé", body: me.email })}>Envoyer un e-mail de test</Button></span><Button disabled={!dirty} onClick={() => { act((d) => updateTemplate(d, me.id, tplId, { subject, body })); toast({ title: "Modèle enregistré" }); }}>Enregistrer</Button></div></div></Card>
            <Card><div className="mb-3 flex items-center justify-between"><p className="text-md font-semibold text-ink">Aperçu</p><SegmentedControl size="sm" label="Appareil" value={device} onChange={setDevice} options={[{ value: "desktop", label: <Monitor className="size-3.5" /> }, { value: "mobile", label: <Smartphone className="size-3.5" /> }]} /></div>
              <div className={cn("mx-auto rounded-lg border border-border bg-canvas p-5", device === "mobile" ? "max-w-[18em]" : "")}><p className="text-xs text-text-muted">De : {s.settings.sender}</p><p className="mt-2 text-base font-semibold text-ink">{sample(subject)}</p><p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-secondary">{sample(body)}</p></div></Card>
          </div>
        </div>
      )}
      {tab === "historique" && (
        <Card padded={false}><table className="w-full text-base"><thead className="bg-canvas text-xs uppercase tracking-[0.06em] text-text-muted"><tr><th className="px-5 py-2.5 text-start">Date</th><th className="text-start">Modèle</th><th className="text-start">Audience</th><th className="text-end">Délivrés</th><th className="px-5 text-end">Ouverts</th></tr></thead>
          <tbody>{s.emailSends.map((e) => <tr key={e.id} onClick={() => setSendRow(e)} className="cursor-pointer border-t border-border hover:bg-canvas"><td className="px-5 py-3 text-text-secondary">{fmtDate(e.ts)}</td><td className="font-medium text-ink">{s.templates.find((t) => t.id === e.templateId)?.name}</td><td className="text-text-secondary">{e.audience}</td><td className="text-end tabular-nums">{e.delivered}/{e.recipients}</td><td className="px-5 text-end tabular-nums">{e.recipients ? Math.round((e.opened / e.recipients) * 100) : 0} %</td></tr>)}</tbody></table></Card>
      )}
      <Drawer open={!!sendRow} onClose={() => setSendRow(null)} title="Détail de l’envoi" subtitle={sendRow ? `${fmtDate(sendRow.ts)} · ${sendRow.audience}` : ""}>
        {sendRow && <div className="flex flex-col gap-4"><div className="grid grid-cols-3 gap-3 text-center">{[["Envoyés", sendRow.recipients], ["Délivrés", sendRow.delivered], ["Ouverts", sendRow.opened]].map(([k, v]) => <div key={k as string} className="rounded-lg border border-border p-3"><p className="text-xl font-semibold tabular-nums text-ink">{v}</p><p className="text-xs text-text-muted">{k}</p></div>)}</div><p className="text-sm text-text-secondary">Les destinataires sont les collaborateurs correspondant à l’audience « {sendRow.audience} » au moment de l’envoi.</p><Badge tone="neutral">Aucun contenu de feedback n’est inclus dans les e-mails</Badge></div>}
      </Drawer>
    </Guard>
  );
}

function FilteredNotifications({ filter }: { filter: "all" | "unread" | NotificationKind }) {
  const { s, me } = useSession();
  if (filter === "all" || filter === "unread") return <NotificationItems filter={filter} />;
  // Kind filter: reuse list with a temporary filter by hiding others via a scoped view
  const n = s.notifications.filter((x) => x.userId === me?.id && x.kind === filter);
  return n.length ? <ul>{n.map((x) => <li key={x.id} className="border-b border-border px-5 py-3"><p className="text-sm font-semibold text-ink">{x.title}</p><p className="text-sm text-text-secondary">{x.body}</p></li>)}</ul> : <p className="px-5 py-10 text-center text-sm text-text-muted">Aucune notification dans cette catégorie.</p>;
}

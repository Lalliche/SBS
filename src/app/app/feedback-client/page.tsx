"use client";
import { Check, Copy, Download, ExternalLink, GripVertical, Link2, MoreHorizontal, Plus, QrCode as QrIcon, Send, X } from "lucide-react";
import { Reorder } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { act } from "@/lib/store/store";
import { createClientLink, duplicateLink, extendLink, setLinkStatus } from "@/lib/store/actions";
import { addDays, clientLinkValidity, fmtDate, relDate } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { useQueryState } from "@/lib/use-query-state";
import type { ClientLink } from "@/lib/store/types";
import { Guard } from "@/components/app/Guard";
import { QrCode } from "@/components/feedback/QrCode";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Field, SegmentedControl, SelectInput, Switch, TextArea, TextInput } from "@/components/ui/FormInputs";
import { Drawer, Modal } from "@/components/ui/Overlay";
import { MenuItem, Popover } from "@/components/ui/Popover";
import { Callout, EmptyState, PageHeader } from "@/components/ui/Surface";
import { useToast } from "@/components/ui/Toast";
import { useShell } from "@/components/app/ShellContext";
import { CLIENT_QUESTIONS } from "@/lib/store/texts";

const origin = () => (typeof window === "undefined" ? "" : window.location.origin);

function Wizard({ onClose, presetMission, onCreated }: { onClose: () => void; presetMission?: string; onCreated: (l: ClientLink) => void }) {
  const { s, me } = useSession();
  const [step, setStep] = useState(0);
  const [mission, setMission] = useState(presetMission ?? "");
  const [title, setTitle] = useState("");
  const [welcome, setWelcome] = useState("Merci de prendre quelques minutes pour partager votre retour sur la mission.");
  const [qs, setQs] = useState<string[]>(CLIENT_QUESTIONS.map((q) => q.id));
  const [custom, setCustom] = useState("");
  const [extra, setExtra] = useState<Array<{ id: string; text: string }>>([]);
  const [expires, setExpires] = useState(addDays(s.now, 30).slice(0, 10));
  const [max, setMax] = useState("10");
  const [ident, setIdent] = useState<ClientLink["identification"]>("FACULTATIVE");
  const [active, setActive] = useState(true);
  const defaultTitle = (() => {
    const m = s.missions.find((x) => x.id === mission);
    return m ? `Votre avis sur notre accompagnement — ${m.name}` : "";
  })();
  const effTitle = title || defaultTitle;
  if (!me) return null;
  const all = [...CLIENT_QUESTIONS, ...extra];
  const valid = [!!mission && !!effTitle.trim(), qs.length > 0, !!expires && Number(max) > 0][step];
  const finish = () => {
    const link = act((d) => createClientLink(d, me.id, { missionId: mission, title: effTitle.trim(), welcome, questionIds: qs, expiresAt: new Date(expires + "T23:59:00Z").toISOString(), maxResponses: Math.max(1, Number(max) || 1), identification: ident, active }));
    onCreated(link);
  };
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-canvas" role="dialog" aria-modal="true" aria-label="Créer un lien client">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg px-6"><p className="text-md font-semibold text-ink">Créer un lien client</p><Button variant="ghost" size="sm" icon={<X className="size-4" />} onClick={onClose}>Fermer</Button></header>
      <div className="mx-auto grid w-full max-w-[72em] flex-1 gap-8 overflow-y-auto px-6 py-8 lg:grid-cols-[1fr_20em]">
        <div>
          <ol className="mb-6 flex gap-2">{["Mission et titre", "Questions", "Paramètres"].map((t, i) => <li key={t} className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-sm", i === step ? "bg-ink text-white" : i < step ? "bg-paper text-ink" : "text-text-muted")}>{i < step ? <Check className="size-3.5" /> : <span className="tabular-nums">{i + 1}</span>}{t}</li>)}</ol>
          <div className="rounded-xl border border-border bg-bg p-6 sm:p-8">
            {step === 0 && <div className="flex flex-col gap-5"><SelectInput label="Mission" required value={mission} onChange={(v) => { setMission(v); setTitle(""); }} placeholder="Choisir une mission" options={s.missions.map((m) => ({ value: m.id, label: m.name }))} /><TextInput label="Titre affiché au client" required value={effTitle} onChange={setTitle} /><TextArea label="Message d’accueil" value={welcome} onChange={setWelcome} rows={3} max={300} /></div>}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-text-secondary">Choisissez et réordonnez les questions (glissez ou cochez).</p>
                <Reorder.Group axis="y" values={qs} onReorder={setQs} className="flex flex-col gap-2">
                  {qs.map((id) => <Reorder.Item key={id} value={id} className="flex cursor-grab items-center gap-3 rounded-lg border border-border bg-bg px-3 py-2.5 active:cursor-grabbing"><GripVertical className="size-4 text-text-muted" /><span className="flex-1 text-base text-text">{all.find((q) => q.id === id)?.text}</span><IconButton label="Retirer" size="sm" onClick={() => setQs(qs.filter((x) => x !== id))}><X className="size-4" /></IconButton></Reorder.Item>)}
                </Reorder.Group>
                {all.filter((q) => !qs.includes(q.id)).length > 0 && <div className="flex flex-wrap gap-2">{all.filter((q) => !qs.includes(q.id)).map((q) => <Button key={q.id} size="sm" variant="secondary" icon={<Plus className="size-3.5" />} onClick={() => setQs([...qs, q.id])}>{q.text.slice(0, 40)}…</Button>)}</div>}
                <div className="flex gap-2 border-t border-border pt-4"><TextInput label="Question personnalisée" value={custom} onChange={setCustom} className="min-w-[18em]" /><Button className="self-end" variant="secondary" disabled={!custom.trim()} onClick={() => { const id = `qx-${extra.length + 1}`; setExtra([...extra, { id, text: custom.trim() }]); setQs([...qs, id]); setCustom(""); }}>Ajouter</Button></div>
              </div>
            )}
            {step === 2 && (
              <div className="flex flex-col gap-5">
                <div className="grid gap-4 sm:grid-cols-2"><Field label="Date d’expiration" required><input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className="h-9 w-full rounded-md border border-border-strong bg-bg px-3 text-base focus-visible:outline-none focus-visible:border-ink" /></Field><TextInput label="Nombre maximal de réponses" type="number" value={max} onChange={setMax} /></div>
                <Field label="Identification du client"><SegmentedControl label="Identification" value={ident} onChange={setIdent} options={[{ value: "AUCUNE", label: "Aucune" }, { value: "FACULTATIVE", label: "Facultative" }, { value: "OBLIGATOIRE", label: "Obligatoire" }]} /></Field>
                <Callout tone="neutral" title="Protection contre les abus">Une seule réponse par appareil est acceptée (limite souple). Aucun compte ni donnée personnelle n’est requis du client.</Callout>
                <div className="flex items-center justify-between"><span className="text-base text-text">Activer le lien</span><Switch checked={active} onChange={setActive} label="Activer le lien" /></div>
              </div>
            )}
            <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
              <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Retour</Button>
              {step < 2 ? <Button onClick={() => setStep(step + 1)} disabled={!valid}>Continuer</Button> : <Button onClick={finish} disabled={!valid}>Créer le lien</Button>}
            </div>
            {!valid && <p className="mt-3 text-xs text-warning">{step === 0 ? "Choisissez une mission et donnez un titre." : step === 1 ? "Gardez au moins une question." : "Renseignez une date et un nombre de réponses."}</p>}
          </div>
        </div>
        <aside aria-label="Aperçu téléphone" className="lg:sticky lg:top-0 lg:self-start"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-text-muted">Aperçu client</p>
          <div className="mx-auto w-[17em] rounded-[2em] border-[0.5em] border-ink bg-bg p-4 shadow-lg"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">SBS</p><p className="mt-1.5 text-base font-semibold leading-snug text-ink">{effTitle || "Titre du lien"}</p><p className="mt-1.5 text-xs text-text-secondary">{welcome}</p><div className="mt-4 flex flex-col gap-3">{qs.slice(0, 3).map((id) => <div key={id}><p className="text-xs font-medium text-ink">{all.find((q) => q.id === id)?.text}</p><div className="mt-1.5 h-8 rounded border border-border-strong bg-canvas" /></div>)}</div></div>
        </aside>
      </div>
    </div>
  );
}

export default function FeedbackClientPage() {
  const { s, me } = useSession();
  const router = useRouter();
  const q = useQueryState();
  const toast = useToast();
  const shell = useShell();
  const [wiz, setWiz] = useState(q.get("nouveau") === "1");
  const [created, setCreated] = useState<ClientLink | null>(null);
  const [drawer, setDrawer] = useState<string | null>(q.get("link") || null);
  const [mailTo, setMailTo] = useState<ClientLink | null>(null);
  const [chips, setChips] = useState<string[]>([]);
  const [chip, setChip] = useState("");
  if (!me) return null;
  const link = (l: ClientLink) => `${origin()}/c/${l.token}`;
  const responsesOf = (l: ClientLink) => s.clientResponses.filter((r) => r.linkId === l.id);
  const dl = drawer ? s.clientLinks.find((l) => l.id === drawer) : null;
  return (
    <Guard action="clientlink.manage">
      <PageHeader title="Feedback client" description="Un lien web par mission : le client répond sans créer de compte." actions={<Button icon={<Plus className="size-4" />} onClick={() => setWiz(true)}>Créer un lien</Button>} />
      <DataTable<ClientLink>
        caption="Liens client"
        rows={s.clientLinks}
        getId={(l) => l.id}
        onRowClick={(l) => setDrawer(l.id)}
        empty={<EmptyState icon={Link2} title="Aucun lien client" description="Recueillez le point de vue du client sur une mission." action={<Button onClick={() => setWiz(true)}>Créer le premier lien</Button>} />}
        columns={[
          { key: "m", header: "Mission", cell: (l) => <span className="font-medium text-ink">{s.missions.find((m) => m.id === l.missionId)?.name}</span> },
          { key: "t", header: "Titre", hideBelow: "lg", cell: (l) => <span className="line-clamp-1 text-text-secondary">{l.title}</span> },
          { key: "s", header: "Statut", cell: (l) => { const v = clientLinkValidity(l, s.clientResponses, s.now); return <StatusPill status={v === "OK" ? "ACTIF" : v === "DESACTIVE" ? "DESACTIVE" : v === "MAX_ATTEINT" ? "EXPIRE" : "EXPIRE"} label={v === "MAX_ATTEINT" ? "Complet" : undefined} />; } },
          { key: "r", header: "Réponses", align: "end", cell: (l) => <span>{responsesOf(l).length} / {l.maxResponses}</span> },
          { key: "e", header: "Expiration", hideBelow: "md", cell: (l) => <span className="text-text-secondary">{fmtDate(l.expiresAt)} <span className="text-text-muted">({relDate(s.now, l.expiresAt)})</span></span> },
        ]}
        rowActions={(l) => (
          <Popover label="Actions" trigger={({ toggle, ref }) => <IconButton ref={ref} label="Actions" size="sm" onClick={toggle}><MoreHorizontal className="size-4" /></IconButton>}>
            {(close) => (
              <div role="menu" className="min-w-[13em] py-1">
                <MenuItem onClick={() => { close(); setDrawer(l.id); }}>Voir les réponses</MenuItem>
                <MenuItem icon={<Copy />} onClick={() => { close(); navigator.clipboard?.writeText(link(l)); toast({ title: "Lien copié" }); }}>Copier le lien</MenuItem>
                <MenuItem onClick={() => { close(); act((d) => extendLink(d, me.id, l.id, 14)); toast({ title: "Lien prolongé de 14 jours" }); }}>Prolonger</MenuItem>
                <MenuItem onClick={() => { close(); act((d) => setLinkStatus(d, me.id, l.id, l.status === "DESACTIVE" ? "ACTIF" : "DESACTIVE")); toast({ title: l.status === "DESACTIVE" ? "Lien réactivé" : "Lien désactivé" }); }}>{l.status === "DESACTIVE" ? "Réactiver" : "Désactiver"}</MenuItem>
                <MenuItem onClick={() => { close(); act((d) => duplicateLink(d, me.id, l.id)); toast({ title: "Lien dupliqué" }); }}>Dupliquer</MenuItem>
              </div>
            )}
          </Popover>
        )}
      />
      {wiz && <Wizard onClose={() => { setWiz(false); router.replace("/app/feedback-client"); }} presetMission={q.get("mission") || undefined} onCreated={(l) => { setWiz(false); setCreated(l); router.replace("/app/feedback-client"); }} />}
      <Modal open={!!created} onClose={() => setCreated(null)} size="lg" title="Votre lien est prêt" subtitle={created?.title} footer={<><Button variant="ghost" onClick={() => setCreated(null)}>Terminer</Button><Button variant="secondary" icon={<ExternalLink className="size-4" />} onClick={() => { shell.openClientPreview(created!.token); setCreated(null); }}>Prévisualiser comme client</Button></>}>
        {created && (
          <div className="grid gap-6 sm:grid-cols-[1fr_11em]">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-canvas p-1.5 ps-3"><span className="min-w-0 flex-1 truncate text-sm text-text">{link(created)}</span><Button size="sm" icon={<Copy className="size-4" />} onClick={() => { navigator.clipboard?.writeText(link(created)); toast({ title: "Lien copié" }); }}>Copier le lien</Button></div>
              <Button variant="secondary" icon={<Send className="size-4" />} onClick={() => { setMailTo(created); setCreated(null); }}>Envoyer par e-mail</Button>
              <Callout tone="neutral">Le lien expire le {fmtDate(created.expiresAt)} ou après {created.maxResponses} réponses.</Callout>
            </div>
            <div className="flex flex-col items-center gap-2"><QrCode seed={created.token} className="w-full rounded-lg border border-border" /><Button size="sm" variant="secondary" icon={<Download className="size-4" />} onClick={() => toast({ title: "QR code téléchargé" })}>Télécharger le QR</Button></div>
          </div>
        )}
      </Modal>
      <Modal open={!!mailTo} onClose={() => setMailTo(null)} title="Envoyer le lien par e-mail" footer={<><Button variant="ghost" onClick={() => setMailTo(null)}>Annuler</Button><Button disabled={!chips.length} icon={<Send className="size-4" />} onClick={() => { toast({ title: `E-mail envoyé à ${chips.length} destinataire${chips.length > 1 ? "s" : ""}` }); setChips([]); setMailTo(null); }}>Envoyer</Button></>}>
        {mailTo && <div className="flex flex-col gap-4">
          <Field label="Destinataires"><div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border-strong p-2">{chips.map((c) => <Badge key={c} tone="neutral">{c}<button type="button" aria-label={`Retirer ${c}`} onClick={() => setChips(chips.filter((x) => x !== c))}><X className="ms-1 size-3" /></button></Badge>)}<input value={chip} onChange={(e) => setChip(e.target.value)} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === ",") && /.+@.+/.test(chip)) { e.preventDefault(); setChips([...chips, chip.trim()]); setChip(""); } }} placeholder="adresse@exemple.com puis Entrée" className="min-w-[12em] flex-1 bg-transparent px-1 text-sm outline-none" /></div></Field>
          <TextInput label="Objet" value={s.templates.find((t) => t.id === "t-client")!.subject.replace("{{mission}}", s.missions.find((m) => m.id === mailTo.missionId)?.name ?? "")} onChange={() => {}} disabled />
          <p className="rounded-lg border border-border bg-canvas p-3 text-sm text-text-secondary">Bonjour, nous serions heureux de recueillir votre retour. {link(mailTo)}</p>
        </div>}
      </Modal>
      <Drawer open={!!dl} onClose={() => setDrawer(null)} title="Réponses" subtitle={dl?.title} width="36em" footer={<><span className="text-sm text-text-muted">{dl ? responsesOf(dl).length : 0} réponse(s)</span><Button size="sm" variant="secondary" icon={<Download className="size-4" />} onClick={() => toast({ title: "Export CSV prêt" })}>Exporter en CSV</Button></>}>
        {dl && (responsesOf(dl).length === 0 ? <EmptyState icon={Link2} title="Aucune réponse pour l’instant" className="py-10" /> : (
          <ul className="flex flex-col gap-3">
            {responsesOf(dl).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => (
              <li key={r.id} className="rounded-lg border border-border p-4"><div className="flex items-center justify-between"><p className="text-base font-medium text-ink">{r.clientName ?? "Client anonyme"}{r.company && <span className="font-normal text-text-muted"> · {r.company}</span>}</p><span className="text-xs text-text-muted">{fmtDate(r.createdAt)}</span></div>{r.rating && <p className="mt-1 text-sm tabular-nums text-text-secondary">Satisfaction : {r.rating} / 5</p>}<p className="mt-2 text-sm text-text-secondary text-pretty">{Object.entries(r.answers).filter(([k]) => k === "qc-4" || k.startsWith("qx")).map(([, v]) => v).join(" ") || "—"}</p></li>
            ))}
          </ul>
        ))}
      </Drawer>
    </Guard>
  );
}
export const _x = { QrIcon };

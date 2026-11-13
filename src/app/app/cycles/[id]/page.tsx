"use client";
import { Archive, CalendarClock, Download, Plus } from "lucide-react";
import { motion } from "motion/react";
import { notFound, useRouter } from "next/navigation";
import { use, useState } from "react";
import { act } from "@/lib/store/store";
import { addReminderRule, sendReminders, setAiMode, setQuota, toggleReminderRule } from "@/lib/store/actions";
import { cycleProgress, daysBetween, fmtDate, fmtDateLong, fullName, relDate } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { activeUsers, quotaFor, rhKpis } from "@/lib/store/selectors";
import { Guard } from "@/components/app/Guard";
import { Kpi } from "@/components/app/Kpi";
import { PersonChip } from "@/components/ui/Avatar";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox, SegmentedControl, SelectInput, Switch, TextInput } from "@/components/ui/FormInputs";
import { Modal } from "@/components/ui/Overlay";
import { Callout, Card, CardHeader, PageHeader } from "@/components/ui/Surface";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { ease, dur } from "@/lib/motion-tokens";

type Tab = "apercu" | "objectifs" | "syntheses" | "archivage";

export default function CyclePage({ params }: PageProps<"/app/cycles/[id]">) {
  const { id } = use(params);
  const { s, me } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("apercu");
  const [preview, setPreview] = useState(false);
  const [rule, setRule] = useState({ label: "", kind: "DEMANDES_EN_ATTENTE" as "DEMANDES_EN_ATTENTE" | "ECART_OBJECTIF" | "FIN_DE_CYCLE", cadence: "HEBDOMADAIRE" as "HEBDOMADAIRE" | "MENSUEL" | "J_MOINS_30" });
  const c = s.cycles.find((x) => x.id === id);
  if (!me) return null;
  if (!c) return notFound();
  const archived = c.status === "ARCHIVE";
  const progress = cycleProgress(c.startDate, c.endDate, s.now);
  const k = rhKpis(s);
  const syn = s.syntheses.filter((x) => x.cycleId === c.id);
  const behind = activeUsers(s).filter((u) => u.role !== "ADMIN_TECH" && !quotaFor(s, u.id, c.id).reached);
  const daysLeft = daysBetween(s.now, c.endDate);
  const impacted = (kind: string) => (kind === "ECART_OBJECTIF" ? behind.length : kind === "DEMANDES_EN_ATTENTE" ? new Set(s.tasks.filter((t) => t.status === "EN_ATTENTE").map((t) => t.giverId)).size : activeUsers(s).length);
  const leaders = s.users.filter((u) => u.role === "RESPONSABLE");
  const fbCount = s.named.filter((f) => f.cycleId === c.id).length + s.anonymous.filter((f) => f.cycleId === c.id).length;
  return (
    <Guard action="cycle.manage">
      <PageHeader breadcrumb={[{ label: "Cycles", href: "/app/cycles" }, { label: c.name }]} title={`Cycle ${c.name}`} description={<span className="flex items-center gap-3"><StatusPill status={c.status} /> {fmtDate(c.startDate)} → {fmtDate(c.endDate)}</span>} />
      {archived && <Callout tone="warning" className="mb-5" title="Cycle archivé — lecture seule">Aucune action n’est possible sur ce cycle. Les synthèses restent consultables et exportables.</Callout>}
      <Tabs label="Cycle" className="mb-6" value={tab} onChange={setTab} items={[{ value: "apercu", label: "Aperçu" }, ...(archived ? [] : [{ value: "objectifs" as const, label: "Objectifs & rappels" }]), { value: "syntheses", label: "Synthèses", count: syn.length }, { value: "archivage", label: archived ? "Archives" : "Archivage" }]} />

      {tab === "apercu" && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Progression de l’année" description={archived ? "Cycle terminé." : `${daysLeft} jours avant l’archivage automatique (${relDate(s.now, c.endDate)}).`} />
            <div className="relative px-1 pb-2 pt-9">
              <div className="h-2.5 overflow-hidden rounded-full bg-paper-deep"><motion.div initial={{ scaleX: 0 }} animate={{ scaleX: Math.max(0.01, progress) }} transition={{ duration: 1.1, ease: ease.outExpo }} className="h-full origin-left rounded-full bg-ink" style={{ width: "100%" }} /></div>
              {!archived && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: dur.slow }} className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${progress * 100}%` }}><span className="rounded bg-accent px-2 py-0.5 text-xs font-medium text-white">{fmtDate(s.now)}</span><span className="h-3 w-px bg-accent" /></motion.div>}
              <div className="mt-2 flex justify-between text-xs text-text-muted"><span>{fmtDate(c.startDate)}</span><span>{fmtDate(c.endDate)}</span></div>
            </div>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Feedbacks" value={fbCount} hint={archived ? "sur le cycle" : `${k.named} nominatifs · ${k.anonymous} anonymes`} />
            <Kpi label="Missions" value={s.missions.filter((m) => m.cycleId === c.id).length} hint="rattachées au cycle" />
            <Kpi label="Synthèses validées" value={syn.filter((x) => x.status === "VALIDEE").length} hint={`sur ${syn.length}`} />
            <Kpi label="Sous l’objectif" value={archived ? 0 : behind.length} hint="collaborateurs à relancer" href="/app/suivi" tone={behind.length ? "warn" : "default"} />
          </div>
        </div>
      )}

      {tab === "objectifs" && !archived && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Objectifs de feedback" description="Valables pour tous les collaborateurs du cycle." />
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-3 gap-4">
                <TextInput label="Minimum de feedbacks reçus" type="number" value={String(c.quotaRule.minReceived)} onChange={(v) => act((d) => setQuota(d, me.id, c.id, { minReceived: Math.max(1, Number(v) || 1) }))} />
                <TextInput label="Minimum de feedbacks donnés" type="number" value={String(c.quotaRule.minGiven)} onChange={(v) => act((d) => setQuota(d, me.id, c.id, { minGiven: Math.max(0, Number(v) || 0) }))} />
                <TextInput label="dont de collaborateurs directs" type="number" value={String(c.quotaRule.minFromDirectReports)} onChange={(v) => act((d) => setQuota(d, me.id, c.id, { minFromDirectReports: Math.max(0, Number(v) || 0) }))} />
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between"><div><p className="text-base font-medium text-ink">Retour obligatoire</p><p className="text-sm text-text-secondary">Certains profils doivent donner leur minimum de feedbacks.</p></div><Switch checked={c.quotaRule.mandatory.enabled} onChange={(v) => act((d) => setQuota(d, me.id, c.id, { mandatory: { ...c.quotaRule.mandatory, enabled: v } }))} label="Retour obligatoire" /></div>
                {c.quotaRule.mandatory.enabled && (
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-3">
                    {(["Junior", "Consultant", "Senior", "Manager", "Directeur"] as const).map((g) => (
                      <Checkbox key={g} checked={c.quotaRule.mandatory.grades.includes(g)} onChange={(on) => act((d) => setQuota(d, me.id, c.id, { mandatory: { ...c.quotaRule.mandatory, grades: on ? [...c.quotaRule.mandatory.grades, g] : c.quotaRule.mandatory.grades.filter((x) => x !== g) } }))} label={g} />
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between"><span className="text-base text-text">Un responsable doit recevoir des retours de son équipe</span><Switch checked={c.quotaRule.teamLeaderNeedsTeamFeedback} onChange={(v) => act((d) => setQuota(d, me.id, c.id, { teamLeaderNeedsTeamFeedback: v }))} label="Retours de l’équipe obligatoires" /></div>
              <div className="flex items-center justify-between"><span className="text-base text-text">Les feedbacks anonymes comptent</span><Switch checked={s.settings.visibility.anonymousCountsInQuota} onChange={(v) => act((d) => { d.settings.visibility.anonymousCountsInQuota = v; })} label="Les feedbacks anonymes comptent" /></div>
              <Callout tone="info">Avec ces règles, l’objectif concerne <b className="tabular-nums">{behind.length}</b> collaborateur{behind.length > 1 ? "s" : ""} encore sous le seuil.</Callout>
            </div>
          </Card>
          <Card>
            <CardHeader title="Règles de rappel" description="Elles se déclenchent à l’avancement du temps." />
            <ul className="divide-y divide-border">
              {c.reminderRules.map((r) => (
                <li key={r.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1"><p className="text-base font-medium text-ink">{r.label}</p><p className="text-xs text-text-muted">{r.cadence === "HEBDOMADAIRE" ? "Chaque semaine" : r.cadence === "MENSUEL" ? "Chaque mois" : "30 jours avant la fin"} · concerne {impacted(r.kind)} personne{impacted(r.kind) > 1 ? "s" : ""} · {r.lastRun ? `dernier envoi ${relDate(s.now, r.lastRun)}` : "jamais envoyé"}</p></div>
                  <Switch checked={r.enabled} onChange={(v) => act((d) => toggleReminderRule(d, me.id, c.id, r.id, v))} label={`Règle ${r.label}`} />
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput label="Nouvelle règle" value={rule.label} onChange={(v) => setRule({ ...rule, label: v })} placeholder="Intitulé" />
                <SelectInput label="Cadence" value={rule.cadence} onChange={(v) => setRule({ ...rule, cadence: v })} options={[{ value: "HEBDOMADAIRE", label: "Hebdomadaire" }, { value: "MENSUEL", label: "Mensuelle" }, { value: "J_MOINS_30", label: "30 jours avant la fin" }]} />
              </div>
              <Button className="self-end" variant="secondary" icon={<Plus className="size-4" />} disabled={!rule.label.trim()} onClick={() => { act((d) => addReminderRule(d, me.id, c.id, rule.kind, rule.cadence, rule.label.trim())); setRule({ ...rule, label: "" }); toast({ title: "Règle ajoutée" }); }}>Ajouter</Button>
            </div>
            <p className="mt-4 text-xs text-text-muted">Rappel : « {c.reminderRules.find((r) => r.enabled)?.label ?? "—"} » concerne {impacted(c.reminderRules.find((r) => r.enabled)?.kind ?? "")} collaborateurs.</p>
          </Card>
          <Card className="xl:col-span-2">
            <CardHeader title="Intelligence artificielle" description="Option sur devis, non incluse dans la plateforme livrée : les points forts et axes sont rédigés par le responsable. L’aperçu ci-dessous sert à la démonstration." action={<Badge tone="violet">Option sur devis</Badge>} />
            <SegmentedControl label="Mode IA" value={c.aiMode} onChange={(v) => act((d) => setAiMode(d, me.id, v))} options={[{ value: "OFF", label: "Désactivée" }, { value: "MANUEL", label: "Rédaction par le responsable seul" }, { value: "ASSISTE", label: "Rédaction assistée par l’IA" }]} />
          </Card>
        </div>
      )}

      {tab === "syntheses" && (
        <Card padded={false}>
          <div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="text-md font-semibold text-ink">Avancement des synthèses</h2>{!archived && <Button size="sm" variant="secondary" onClick={() => { act((d) => sendReminders(d, me.id, "RESPONSABLES", "t-rappel-objectif", leaders.map((l) => l.id))); toast({ title: `${leaders.length} responsables relancés` }); }}>Relancer les responsables</Button>}</div>
          <table className="w-full text-base"><thead className="bg-canvas text-xs uppercase tracking-[0.06em] text-text-muted"><tr><th className="px-5 py-2.5 text-start">Collaborateur</th><th className="px-3 text-start">Responsable</th><th className="px-5 text-start">Statut</th>{archived && <th className="px-5" />}</tr></thead>
            <tbody>
              {syn.map((x) => { const u = s.users.find((y) => y.id === x.userId)!; const l = s.users.find((y) => u.leaderIds.includes(y.id)); return (
                <tr key={x.id} className="border-t border-border"><td className="px-5 py-2.5"><PersonChip user={u} dept={s.departments.find((d) => d.id === u.departmentId)} /></td><td className="px-3 text-text-secondary">{l ? fullName(l) : "—"}</td><td className="px-5"><StatusPill status={x.status} /></td>{archived && <td className="px-5 text-end"><Button size="sm" variant="ghost" icon={<Download className="size-4" />} onClick={() => toast({ title: "PDF prêt", body: `Synthese-${u.lastName}-${c.name}.pdf` })}>PDF</Button></td>}</tr>
              ); })}
              {syn.length === 0 && <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-text-muted">Aucune synthèse pour ce cycle.</td></tr>}
            </tbody></table>
        </Card>
      )}

      {tab === "archivage" && (
        <div className="flex max-w-[46em] flex-col gap-6">
          {archived ? (
            <Card><CardHeader title="Cycle archivé" /><p className="text-base text-text-secondary text-pretty">Ce cycle a été archivé automatiquement à sa date de fin ({fmtDateLong(c.endDate)}). Il est en lecture seule : plus aucun feedback ne peut être envoyé et les synthèses sont figées.</p><Button className="mt-4" variant="secondary" onClick={() => { act((d) => { d.viewingCycleId = c.id; }); router.push("/app/cycles"); }}>Afficher la bannière « lecture seule »</Button></Card>
          ) : (
            <>
              <Card>
                <CardHeader title="Archivage automatique" description="Il n’existe aucun bouton d’archivage manuel." />
                <p className="text-base leading-relaxed text-text-secondary text-pretty">À la date de fin ({fmtDateLong(c.endDate)}), le cycle passe en lecture seule, ses moyennes sont figées dans les synthèses, et le cycle suivant s’ouvre le lendemain. Les responsables et les RH sont notifiés.</p>
                <div className="mt-5 flex items-center gap-4"><span className="flex size-10 items-center justify-center rounded-full bg-paper"><CalendarClock className="size-5" /></span><p className="text-base"><b className="tabular-nums">{daysLeft}</b> jours restants</p></div>
                <Button className="mt-5" variant="secondary" icon={<Archive className="size-4" />} onClick={() => setPreview(true)}>Prévisualiser l’archivage</Button>
              </Card>
              <Callout tone="neutral">Pour voir l’archivage en action, utilisez « Avancer le temps › Jusqu’à la fin du cycle » dans la barre de démonstration.</Callout>
            </>
          )}
        </div>
      )}

      <Modal open={preview} onClose={() => setPreview(false)} title="Ce qui se passera le jour de l’archivage" footer={<Button onClick={() => setPreview(false)}>Compris</Button>}>
        <ul className="flex flex-col gap-3 text-base text-text">
          {[`Le cycle ${c.name} passe en lecture seule`, `${syn.filter((x) => x.status !== "VALIDEE").length} synthèse(s) non validée(s) seront figées en l’état`, "Les moyennes par compétence sont enregistrées pour la comparaison future", `Le cycle suivant s’ouvre le lendemain`, "RH et responsables d’équipe sont notifiés", "Les brouillons de feedback restent copiables mais ne peuvent plus être envoyés"].map((t) => <li key={t} className="flex items-start gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink" />{t}</li>)}
        </ul>
      </Modal>
    </Guard>
  );
}

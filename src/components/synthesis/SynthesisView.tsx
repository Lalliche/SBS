"use client";
import { ArrowDown, ArrowUp, Check, Download, FileText, Lock, Plus, Printer, Sparkles, Table2, ThumbsDown, ThumbsUp, Trash2, Unlock, X } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useMemo, useState } from "react";
import logo from "@/assets/sbs-logo.png";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion-tokens";
import { act } from "@/lib/store/store";
import { addSynthesisItem, ensureSynthesis, generateAiSuggestions, ignoreAiSuggestion, moveSynthesisItem, rateAiSuggestion, removeSynthesisItem, reopenSynthesis, restoreSynthesisItem, synthesisChecklist, updateSynthesisItem, applyAiSuggestion, validateSynthesis } from "@/lib/store/actions";
import { evolution, fmtDate, fmtNum, fullName, relationLabel } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { feedbackAbout, previousCycle, snapshotFor, statsFor } from "@/lib/store/selectors";
import type { Synthesis, SynthesisItem } from "@/lib/store/types";
import { Radar, RadarLegend, SERIES, type RadarSeries } from "@/components/charts/Radar";
import { AnonymousBadge, Avatar } from "@/components/ui/Avatar";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/FormInputs";
import { Drawer, Modal } from "@/components/ui/Overlay";
import { Callout, Card, CardHeader, EmptyState, PageHeader, ProgressBar } from "@/components/ui/Surface";
import { useToast } from "@/components/ui/Toast";

const STEPS = [["NON_COMMENCEE", "Non commencée"], ["EN_REDACTION", "En rédaction"], ["VALIDEE", "Validée"]] as const;

function ItemEditor({ item, locked, onSave, onRemove, onMove, comps, first, last, kind }: { item: SynthesisItem; locked: boolean; onSave: (p: { text?: string; competencyId?: string }) => void; onRemove: () => void; onMove: (d: -1 | 1) => void; comps: Array<{ id: string; name: string }>; first: boolean; last: boolean; kind: "strengths" | "axes" }) {
  const [text, setText] = useState(item.text);
  return (
    <li className={cn("group rounded-lg border bg-bg p-3.5", kind === "strengths" ? "border-success/20" : "border-warning/25")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select aria-label="Compétence" disabled={locked} value={item.competencyId} onChange={(e) => onSave({ competencyId: e.target.value })} className="rounded-full border border-border bg-canvas py-0.5 ps-2 pe-1 text-xs font-medium text-text-secondary disabled:opacity-70">
            {comps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {item.fromAi && <Badge tone="violet" icon={<Sparkles className="size-3" />}>IA — validé</Badge>}
        </div>
        {!locked && (
          <div className="flex items-center opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100">
            <IconButton label="Monter" size="sm" disabled={first} onClick={() => onMove(-1)}><ArrowUp className="size-3.5" /></IconButton>
            <IconButton label="Descendre" size="sm" disabled={last} onClick={() => onMove(1)}><ArrowDown className="size-3.5" /></IconButton>
            <IconButton label="Supprimer" size="sm" onClick={onRemove}><Trash2 className="size-3.5" /></IconButton>
          </div>
        )}
      </div>
      <textarea aria-label="Texte" rows={2} disabled={locked} value={text} onChange={(e) => setText(e.target.value)} onBlur={() => text !== item.text && onSave({ text })} className="w-full resize-none rounded-md border border-transparent bg-transparent px-1 py-1 text-base leading-relaxed text-text transition-colors hover:border-border focus-visible:border-ink focus-visible:bg-bg focus-visible:outline-none disabled:opacity-100" />
    </li>
  );
}

function ListBlock({ title, kind, items, locked, userId, cycleId, onAdd }: { title: string; kind: "strengths" | "axes"; items: SynthesisItem[]; locked: boolean; userId: string; cycleId: string; onAdd: () => void }) {
  const { s } = useSession();
  const toast = useToast();
  const comps = s.competencies;
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-md font-semibold text-ink">{title}</h3>
        {!locked && <Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={onAdd}>Ajouter</Button>}
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong px-4 py-6 text-center text-sm text-text-muted">{kind === "strengths" ? "Aucun point fort rédigé." : "Aucun axe de développement rédigé."}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((it, i) => (
            <ItemEditor key={`${it.id}-${it.text}-${it.competencyId}`} kind={kind} item={it} locked={locked} comps={comps} first={i === 0} last={i === items.length - 1}
              onSave={(p) => act((d) => updateSynthesisItem(d, userId, cycleId, kind, it.id, p))}
              onMove={(dir) => act((d) => moveSynthesisItem(d, userId, cycleId, kind, it.id, dir))}
              onRemove={() => { act((d) => removeSynthesisItem(d, userId, cycleId, kind, it.id)); toast({ title: "Élément supprimé", undo: () => act((d) => restoreSynthesisItem(d, userId, cycleId, kind, it, i)) }); }} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function SynthesisView({ userId, cycleId, onCycleChange }: { userId: string; cycleId: string; onCycleChange: (id: string) => void }) {
  const { s, me, can, open } = useSession();
  const toast = useToast();
  const [asTable, setAsTable] = useState(false);
  const [missionFilter, setMissionFilter] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [validate, setValidate] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const user = s.users.find((u) => u.id === userId)!;
  const cycle = s.cycles.find((c) => c.id === cycleId)!;
  const archived = cycle.status === "ARCHIVE";
  const syn: Synthesis | undefined = s.syntheses.find((x) => x.userId === userId && x.cycleId === cycleId);
  const isLeader = !!me && user.leaderIds.includes(me.id) && can("synthesis.write");
  const isSelf = me?.id === userId;
  const locked = archived || syn?.status === "VALIDEE" || !isLeader;
  const live = !archived;
  const overall = live ? statsFor(s, userId, cycleId) : null;
  const snap = overall ? overall.overall : snapshotFor(s, userId, cycleId);
  const prev = previousCycle(s, cycleId);
  const prevSnap = prev ? s.syntheses.find((x) => x.userId === userId && x.cycleId === prev.id)?.snapshot : undefined;
  const axes = s.competencies.map((c) => c.name);
  const series: RadarSeries[] = [];
  if (prevSnap) series.push({ id: "archive", label: `Cycle ${prev!.name}`, values: s.competencies.map((c) => prevSnap.find((x) => x.competencyId === c.id)?.average ?? null), ...SERIES.archive });
  if (live && s.settings.visibility.radarByRelation && overall) (["RESPONSABLE", "PAIR", "EQUIPE"] as const).forEach((r) => {
    const vals = s.competencies.map((c) => overall.by[r].find((x) => x.competencyId === c.id)?.average ?? null);
    if (vals.some((v) => v !== null)) series.push({ id: r, label: relationLabel[r], values: vals, ...SERIES[r] });
  });
  series.push({ id: "ensemble", label: "Ensemble", values: s.competencies.map((c) => snap.find((x) => x.competencyId === c.id)?.average ?? null), fill: true, ...SERIES.ensemble });

  const verbatims = useMemo(() => (me && live ? feedbackAbout(s, userId, cycleId, me.id).filter((f) => !missionFilter || f.missionId === missionFilter) : []), [s, me, userId, cycleId, live, missionFilter]);
  const cycles = s.cycles.filter((c) => s.syntheses.some((x) => x.userId === userId && x.cycleId === c.id) || c.id === open.id);
  const checklist = syn ? synthesisChecklist(syn) : { strengths: false, axes: false, ai: true };
  const canValidate = checklist.strengths && checklist.axes && checklist.ai;
  const missionsIn = [...new Set(feedbackAbout(s, userId, cycleId, me?.id ?? "").map((f) => f.missionId).filter(Boolean))] as string[];
  const showAi = cycle.aiMode === "ASSISTE" && isLeader && !locked;
  if (!syn && !isLeader && !archived && !(isSelf && s.settings.visibility.seeOwnSynthesis)) return null;
  const status = syn?.status ?? "NON_COMMENCEE";
  const stepIdx = STEPS.findIndex(([k]) => k === status);

  return (
    <div>
      <PageHeader
        breadcrumb={[{ label: "Synthèses", href: isLeader ? "/app/syntheses" : undefined }, { label: fullName(user) }]}
        title={`Synthèse de ${fullName(user)}`}
        description={`${user.jobTitle} · cycle ${cycle.name}`}
        actions={
          <>
            <select aria-label="Cycle" value={cycleId} onChange={(e) => onCycleChange(e.target.value)} className="h-9 rounded-md border border-border-strong bg-bg px-3 text-base">
              {cycles.map((c) => <option key={c.id} value={c.id}>{c.name}{c.status === "ARCHIVE" ? " (archivé)" : ""}</option>)}
            </select>
            {(isLeader || (isSelf && s.settings.visibility.pdfForCollaborateur)) && <Button variant="secondary" icon={<Download className="size-4" />} onClick={() => setExportOpen(true)}>Exporter en PDF</Button>}
            {isLeader && !archived && status !== "VALIDEE" && <Button icon={<Check className="size-4" />} onClick={() => setValidate(true)}>Valider la synthèse</Button>}
            {isLeader && !archived && status === "VALIDEE" && <Button variant="secondary" icon={<Unlock className="size-4" />} onClick={() => { act((d) => reopenSynthesis(d, userId, cycleId)); toast({ title: "Synthèse rouverte" }); }}>Rouvrir</Button>}
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-6">
        <ol className="flex items-center gap-2" aria-label="Statut de la synthèse">
          {STEPS.map(([k, label], i) => (
            <li key={k} className="flex items-center gap-2">
              <span className={cn("flex items-center gap-2 text-sm", i <= stepIdx ? "font-medium text-ink" : "text-text-muted")}>
                <span className={cn("flex size-5 items-center justify-center rounded-full border text-[0.7em] font-semibold", i < stepIdx ? "border-ink bg-ink text-white" : i === stepIdx ? "border-accent text-accent" : "border-border-strong")}>{i < stepIdx ? <Check className="size-3" strokeWidth={3} /> : i + 1}</span>
                {label}
              </span>
              {i < STEPS.length - 1 && <span className="h-px w-6 bg-border-strong" />}
            </li>
          ))}
        </ol>
        {locked && !archived && status === "VALIDEE" && <Badge tone="success" icon={<Lock className="size-3" />}>Champs verrouillés</Badge>}
      </div>
      <Callout tone="neutral" className="mb-6">Cette synthèse accompagne l’évaluation annuelle réalisée dans l’outil de SBS. Elle ne contient aucune note finale.</Callout>
      {archived && !syn?.snapshot && <Callout tone="warning" className="mb-6" title="Aucune donnée archivée pour ce cycle" />}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Vue d’ensemble" description={overall ? `${overall.count} feedback${overall.count > 1 ? "s" : ""} sur ${overall.missions} mission${overall.missions > 1 ? "s" : ""}` : "Moyennes figées à l’archivage"} action={<Button size="sm" variant="ghost" icon={<Table2 className="size-4" />} onClick={() => setAsTable((v) => !v)}>{asTable ? "Voir le radar" : "Voir en tableau"}</Button>} />
            {s.settings.visibility.seeCompetencyAverage || isLeader ? (
              asTable ? (
                <table className="w-full text-sm"><thead className="text-xs uppercase tracking-[0.06em] text-text-muted"><tr><th className="py-2 text-start">Compétence</th>{series.map((x) => <th key={x.id} className="py-2 text-end">{x.label}</th>)}</tr></thead>
                  <tbody>{axes.map((a, i) => <tr key={a} className="border-t border-border"><td className="py-2">{a}</td>{series.map((x) => <td key={x.id} className="py-2 text-end tabular-nums">{fmtNum(x.values[i])}</td>)}</tr>)}</tbody></table>
              ) : (
                <>
                  <Radar axes={axes} series={series} />
                  <div className="mt-4"><RadarLegend series={series} /></div>
                </>
              )
            ) : <p className="rounded-md bg-paper px-4 py-3 text-sm text-text-secondary">Les moyennes par compétence ne sont pas affichées.</p>}
          </Card>
          <Card padded={false}>
            <table className="w-full text-base">
              <caption className="sr-only">Moyennes par compétence (sans total)</caption>
              <thead className="bg-canvas text-xs uppercase tracking-[0.06em] text-text-muted"><tr><th className="px-5 py-2.5 text-start">Compétence</th><th className="px-3 text-end">Moyenne</th><th className="px-3 text-end">Notes</th><th className="px-3 text-end">Feedbacks</th><th className="px-5 text-end">Évolution</th></tr></thead>
              <tbody>
                {s.competencies.map((c) => {
                  const x = snap.find((y) => y.competencyId === c.id);
                  const p = prevSnap?.find((y) => y.competencyId === c.id);
                  const ev = evolution(x?.average ?? null, p?.average ?? null);
                  return (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-5 py-3 font-medium text-ink">{c.name}</td>
                      <td className="px-3 text-end tabular-nums">{fmtNum(x?.average ?? null)}<span className="text-text-muted"> / 5</span></td>
                      <td className="px-3 text-end tabular-nums text-text-secondary">{x?.ratingCount ?? 0}</td>
                      <td className="px-3 text-end tabular-nums text-text-secondary">{x?.feedbackCount ?? 0}</td>
                      <td className={cn("px-5 text-end tabular-nums", ev === null ? "text-text-muted" : ev > 0 ? "text-success" : ev < 0 ? "text-danger" : "text-text-secondary")}>{ev === null ? "—" : `${ev > 0 ? "+" : ""}${fmtNum(ev)}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="border-t border-border px-5 py-2.5 text-xs text-text-muted">Moyennes simples, sans pondération ni score global. « — » : aucune note donnée.</p>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {showAi && (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-[#5B3FA0]/20 bg-[#F1EDF8] px-4 py-3">
              <p className="text-sm text-[#5B3FA0]"><span className="font-semibold">Assistant IA</span> — propose des points forts et des axes à partir des réponses écrites. Vous décidez de tout.</p>
              <Button size="sm" icon={<Sparkles className="size-4" />} onClick={() => { if (!syn?.aiSuggestions.length) act((d) => generateAiSuggestions(d, userId, cycleId)); setAiOpen(true); }}>Proposer avec l’IA</Button>
            </div>
          )}
          <Card>
            <div className="flex flex-col gap-8">
              <ListBlock title="Points forts" kind="strengths" items={syn?.strengths ?? []} locked={locked} userId={userId} cycleId={cycleId} onAdd={() => act((d) => { ensureSynthesis(d, userId, cycleId); const top = [...snap].sort((a, b) => (b.average ?? 0) - (a.average ?? 0))[0]; addSynthesisItem(d, userId, cycleId, "strengths", top?.competencyId ?? d.competencies[0].id, ""); })} />
              <ListBlock title="Axes de développement" kind="axes" items={syn?.axes ?? []} locked={locked} userId={userId} cycleId={cycleId} onAdd={() => act((d) => { ensureSynthesis(d, userId, cycleId); const low = [...snap].filter((x) => x.average !== null).sort((a, b) => (a.average ?? 0) - (b.average ?? 0))[0]; addSynthesisItem(d, userId, cycleId, "axes", low?.competencyId ?? d.competencies[0].id, ""); })} />
            </div>
          </Card>
        </div>
      </div>

      {live && (
        <section className="mt-8" aria-label="Réponses écrites">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-md font-semibold text-ink">Réponses écrites par compétence</h2>
            <select aria-label="Mission" value={missionFilter} onChange={(e) => setMissionFilter(e.target.value)} className="h-9 rounded-md border border-border-strong bg-bg px-3 text-sm">
              <option value="">Toutes les missions</option>
              {missionsIn.map((id) => <option key={id} value={id}>{s.missions.find((m) => m.id === id)?.name}</option>)}
            </select>
          </div>
          {verbatims.length === 0 ? <Card><EmptyState icon={FileText} title="Aucune réponse écrite à afficher" description={isSelf && !s.settings.visibility.seeReceived ? "Vos feedbacks ne sont pas consultables pour le moment." : undefined} className="py-8" /></Card> : (
            <div className="grid gap-5 lg:grid-cols-2">
              {s.questions.filter((q) => q.kind === "COLLAB" && q.active).sort((a, b) => a.order - b.order).map((q) => {
                const list = verbatims.filter((f) => f.answers[q.id]?.trim() && !f.hidden);
                if (!list.length) return null;
                return (
                  <Card key={q.id}>
                    <h3 className="mb-3 text-base font-semibold text-ink">{s.competencies.find((c) => c.id === q.competencyId)?.name ?? "Commentaire libre"} <span className="font-normal text-text-muted">· {list.length}</span></h3>
                    <ul className="flex flex-col gap-3.5">
                      {list.slice(0, 4).map((f) => (
                        <li key={f.id} className="border-s-2 border-border-strong ps-3.5">
                          <p className="text-base leading-relaxed text-text text-pretty">{f.answers[q.id]}</p>
                          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                            {f.kind === "ANONYME" ? <AnonymousBadge /> : f.author ? <><Avatar user={f.author} dept={s.departments.find((d) => d.id === f.author!.departmentId)} size="xs" />{fullName(f.author)}</> : <Badge tone="neutral">Nominatif</Badge>}
                            {f.relation && <Badge tone="neutral">{relationLabel[f.relation]}</Badge>}
                            <span>{fmtDate(f.createdAt)}</span>
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* AI panel */}
      <Drawer open={aiOpen} onClose={() => setAiOpen(false)} title="Proposition de l’assistant IA" subtitle="Généré par IA — à vérifier. Rien n’entre dans la synthèse sans votre action." width="34em">
        {!syn || syn.aiSuggestions.length === 0 ? <EmptyState icon={Sparkles} title="Pas assez de notes pour proposer une synthèse" className="py-8" /> : (
          <ul className="flex flex-col gap-4">
            {syn.aiSuggestions.map((sg) => (
              <SuggestionCard key={sg.id} sg={sg} userId={userId} cycleId={cycleId} compName={s.competencies.find((c) => c.id === sg.competencyId)?.name ?? ""} />
            ))}
          </ul>
        )}
        <p className="mt-6 text-xs text-text-muted">L’IA ne modifie jamais une note et ne publie rien sans validation.</p>
      </Drawer>

      {/* Validate */}
      <Modal open={validate} onClose={() => setValidate(false)} title="Valider la synthèse" subtitle={`Pour ${fullName(user)}`} footer={<><Button variant="ghost" onClick={() => setValidate(false)}>Annuler</Button><Button disabled={!canValidate} onClick={() => { act((d) => validateSynthesis(d, userId, cycleId, me!.id)); setValidate(false); toast({ title: "Synthèse validée", body: "Les champs sont verrouillés." }); }}>Valider</Button></>}>
        <ul className="flex flex-col gap-2.5">
          {[[checklist.strengths, "Points forts rédigés"], [checklist.axes, "Axes de développement rédigés"], [checklist.ai, "Aucune suggestion IA non traitée"]].map(([ok, label]) => (
            <li key={label as string} className="flex items-center gap-2.5 text-base text-text"><span className={cn("flex size-5 items-center justify-center rounded-full", ok ? "bg-success text-white" : "border border-border-strong")}>{ok ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3 text-text-muted" />}</span>{label as string}</li>
          ))}
        </ul>
        {s.settings.visibility.seeOwnSynthesis && <Callout tone="info" className="mt-4">La synthèse deviendra visible par {user.firstName} {user.lastName}.</Callout>}
        {!canValidate && <p className="mt-3 text-sm text-warning">Complétez les points ci-dessus pour valider.</p>}
      </Modal>

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} user={user} cycleName={cycle.name} axes={axes} series={series} snap={snap} syn={syn} />
    </div>
  );
}

function SuggestionCard({ sg, userId, cycleId, compName }: { sg: Synthesis["aiSuggestions"][number]; userId: string; cycleId: string; compName: string }) {
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(sg.suggestion);
  const toast = useToast();
  const done = sg.status !== "PENDING";
  return (
    <li className={cn("rounded-lg border p-4", done ? "border-border bg-canvas opacity-80" : "border-[#5B3FA0]/20 bg-bg")}>
      <div className="flex items-center justify-between gap-2"><Badge tone={sg.kind === "STRENGTH" ? "success" : "warning"}>{sg.kind === "STRENGTH" ? "Point fort" : "Axe de développement"} · {compName}</Badge>{done && <Badge tone="neutral">{sg.status === "USED" ? "Utilisée" : "Ignorée"}</Badge>}</div>
      <p className="mt-2.5 text-sm text-text-secondary">{sg.summary}</p>
      {edit ? <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="mt-2 w-full rounded-md border border-border-strong p-2.5 text-base focus-visible:border-ink focus-visible:outline-none" /> : <p className="mt-2 text-base leading-relaxed text-ink text-pretty">« {text} »</p>}
      <p className="mt-2 text-xs text-text-muted">Basé sur {sg.basedOn.responses} feedback{sg.basedOn.responses > 1 ? "s" : ""}, {sg.basedOn.missions} mission{sg.basedOn.missions > 1 ? "s" : ""}.</p>
      {!done && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { act((d) => applyAiSuggestion(d, userId, cycleId, sg.id, text)); toast({ title: "Ajouté à la synthèse" }); }}>Utiliser</Button>
            <Button size="sm" variant="secondary" onClick={() => setEdit((e) => !e)}>{edit ? "Terminer" : "Modifier"}</Button>
            <Button size="sm" variant="ghost" onClick={() => act((d) => ignoreAiSuggestion(d, userId, cycleId, sg.id))}>Ignorer</Button>
          </div>
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <IconButton label="Utile" size="sm" active={sg.helpful === true} onClick={() => act((d) => rateAiSuggestion(d, userId, cycleId, sg.id, true))}><ThumbsUp className="size-3.5" /></IconButton>
            <IconButton label="Pas utile" size="sm" active={sg.helpful === false} onClick={() => act((d) => rateAiSuggestion(d, userId, cycleId, sg.id, false))}><ThumbsDown className="size-3.5" /></IconButton>
          </div>
        </div>
      )}
    </li>
  );
}

function ExportModal({ open, onClose, user, cycleName, axes, series, snap, syn }: { open: boolean; onClose: () => void; user: { firstName: string; lastName: string; jobTitle: string }; cycleName: string; axes: string[]; series: RadarSeries[]; snap: Array<{ competencyId: string; average: number | null; ratingCount: number; feedbackCount: number }>; syn?: Synthesis }) {
  const { s } = useSession();
  const toast = useToast();
  const [opts, setOpts] = useState({ radar: true, table: true, lists: true, verbatims: false });
  const [progress, setProgress] = useState<number | null>(null);
  const download = () => {
    setProgress(0);
    let p = 0;
    const t = setInterval(() => {
      p += 14 + Math.random() * 10;
      if (p >= 100) {
        clearInterval(t);
        setProgress(null);
        toast({ title: "PDF prêt", body: `Synthese-${user.lastName}-${cycleName}.pdf` });
        onClose();
      } else setProgress(p);
    }, 160);
  };
  return (
    <Modal open={open} onClose={onClose} size="lg" title="Exporter en PDF" subtitle="Choisissez le contenu ; l’aperçu A4 se met à jour." footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="secondary" icon={<Printer className="size-4" />} onClick={() => window.print()}>Imprimer</Button><Button loading={progress !== null} icon={<Download className="size-4" />} onClick={download}>{progress !== null ? `${Math.round(progress)} %` : "Télécharger le PDF"}</Button></>}>
      <div className="grid gap-5 sm:grid-cols-[13em_1fr]">
        <div className="flex flex-col gap-3">
          <Checkbox checked={opts.radar} onChange={(v) => setOpts({ ...opts, radar: v })} label="Radar" />
          <Checkbox checked={opts.table} onChange={(v) => setOpts({ ...opts, table: v })} label="Tableau des moyennes" />
          <Checkbox checked={opts.lists} onChange={(v) => setOpts({ ...opts, lists: v })} label="Points forts et axes" />
          <Checkbox checked={opts.verbatims} onChange={(v) => setOpts({ ...opts, verbatims: v })} label="Réponses écrites" />
          {progress !== null && <ProgressBar value={progress / 100} />}
        </div>
        <div className="print-area mx-auto aspect-[1/1.414] w-full max-w-[22em] overflow-hidden rounded-sm border border-border-strong bg-white p-[1.4em] text-[0.62em] shadow-md">
          <header className="flex items-center justify-between border-b border-border pb-2"><Image src={logo} alt="SBS" className="h-[2.6em] w-auto" sizes="80px" /><span className="text-text-muted">Cycle {cycleName}</span></header>
          <h3 className="mt-3 text-[1.6em] font-semibold text-ink">{user.firstName} {user.lastName}</h3>
          <p className="text-text-secondary">{user.jobTitle}</p>
          {opts.radar && <div className="mt-2"><Radar axes={axes} series={series.filter((x) => x.id === "ensemble")} size="62%" /></div>}
          {opts.table && <table className="mt-2 w-full"><tbody>{s.competencies.map((c) => <tr key={c.id} className="border-t border-border"><td className="py-0.5">{c.name}</td><td className="text-end tabular-nums">{fmtNum(snap.find((x) => x.competencyId === c.id)?.average ?? null)}</td></tr>)}</tbody></table>}
          {opts.lists && <div className="mt-2 grid grid-cols-2 gap-2"><div><p className="font-semibold text-ink">Points forts</p>{(syn?.strengths ?? []).slice(0, 2).map((i) => <p key={i.id} className="mt-0.5 line-clamp-2">• {i.text}</p>)}</div><div><p className="font-semibold text-ink">Axes</p>{(syn?.axes ?? []).slice(0, 2).map((i) => <p key={i.id} className="mt-0.5 line-clamp-2">• {i.text}</p>)}</div></div>}
          <p className="mt-2 text-text-muted">Cette synthèse accompagne l’évaluation annuelle. Elle ne contient aucune note finale.</p>
        </div>
      </div>
    </Modal>
  );
}
export const _m = { motion, spring, StatusPill };

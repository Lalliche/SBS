"use client";
import { GripVertical, Plus, Smartphone } from "lucide-react";
import { Reorder } from "motion/react";
import { useState } from "react";
import { act } from "@/lib/store/store";
import { setQuestionActive, updateCompetency, updateQuestion } from "@/lib/store/actions";
import { gradeBand, questionBankWarning, questionText, relationLabel } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import type { GradeBand, Question, Relation } from "@/lib/store/types";
import { Guard } from "@/components/app/Guard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SegmentedControl, Switch, TextArea, TextInput } from "@/components/ui/FormInputs";
import { Drawer, Modal } from "@/components/ui/Overlay";
import { Callout, Card, PageHeader } from "@/components/ui/Surface";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { CLIENT_QUESTIONS } from "@/lib/store/texts";

type Tab = "competences" | "banque" | "client";
const BANDS: Array<{ value: GradeBand; label: string }> = [{ value: "JUNIOR", label: "Junior" }, { value: "CONFIRME", label: "Confirmé" }, { value: "SENIOR", label: "Senior" }];

export default function CompetencesPage() {
  const { s, me } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("competences");
  const [editComp, setEditComp] = useState<string | null>(null);
  const [cName, setCName] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [qOpen, setQOpen] = useState<Question | null>(null);
  const [rel, setRel] = useState<Relation>("PAIR");
  const [band, setBand] = useState<GradeBand>("CONFIRME");
  const [text, setText] = useState("");
  const [prev, setPrev] = useState(false);
  const [pRel, setPRel] = useState<Relation>("PAIR");
  const [pGrade, setPGrade] = useState<GradeBand>("CONFIRME");
  const [order, setOrder] = useState(CLIENT_QUESTIONS.map((q) => q.id));
  if (!me) return null;
  const collab = s.questions.filter((q) => q.kind === "COLLAB").sort((a, b) => a.order - b.order);
  const warn = questionBankWarning(s.questions);
  const openQ = (q: Question) => { setQOpen(q); setRel("PAIR"); setBand("CONFIRME"); setText(q.variants.PAIR.CONFIRME); };
  const pick = (r: Relation, b: GradeBand, q = qOpen) => { setRel(r); setBand(b); setText(q?.variants[r][b] ?? ""); };
  return (
    <Guard action="referentials.edit">
      <PageHeader title="Compétences & questions" description="Le référentiel de SBS : six compétences, des questions adaptées à la relation et au grade." actions={<Button variant="secondary" icon={<Smartphone className="size-4" />} onClick={() => setPrev(true)}>Aperçu du formulaire</Button>} />
      <Tabs label="Référentiel" className="mb-6" value={tab} onChange={setTab} items={[{ value: "competences", label: "Compétences", count: s.competencies.length }, { value: "banque", label: "Banque de questions", count: collab.filter((q) => q.active).length }, { value: "client", label: "Questions client" }]} />
      {tab === "competences" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {s.competencies.map((c, i) => (
            <Card key={c.id} className="flex flex-col gap-3">
              <span className="font-display text-lg text-accent tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="text-md font-semibold text-ink">{c.name}</h2>
              <p className="flex-1 text-sm text-text-secondary text-pretty">{c.description}</p>
              <div className="flex items-center justify-between border-t border-border pt-3"><Badge tone="neutral">{s.questions.filter((q) => q.competencyId === c.id && q.kind === "COLLAB").length} question</Badge><Button size="sm" variant="secondary" onClick={() => { setEditComp(c.id); setCName(c.name); setCDesc(c.description); }}>Modifier</Button></div>
            </Card>
          ))}
        </div>
      )}
      {tab === "banque" && (
        <div className="flex flex-col gap-4">
          <Callout tone="info">Les modifications s’appliquent aux feedbacks futurs uniquement.</Callout>
          {warn && <Callout tone="warning" title="Taille de la banque">{warn}</Callout>}
          <Card padded={false}>
            <ul className="divide-y divide-border">
              {collab.map((q) => (
                <li key={q.id} className="flex items-center gap-4 px-5 py-3.5">
                  <button type="button" onClick={() => openQ(q)} className="min-w-0 flex-1 text-start focus-visible:shadow-none">
                    <p className="text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">{s.competencies.find((c) => c.id === q.competencyId)?.name ?? "Commentaire libre"}</p>
                    <p className="mt-0.5 line-clamp-2 text-base text-text hover:text-accent">{q.variants.PAIR.CONFIRME}</p>
                  </button>
                  <Switch checked={q.active} onChange={(v) => { act((d) => setQuestionActive(d, me.id, q.id, v)); toast({ title: v ? "Question activée" : "Question désactivée" }); }} label="Question active" />
                </li>
              ))}
            </ul>
            <div className="border-t border-border px-5 py-3"><Button size="sm" variant="secondary" icon={<Plus className="size-4" />} onClick={() => toast({ title: "Aperçu", body: "L’ajout de questions sera disponible dans la version finale.", tone: "info" })}>Ajouter une question</Button></div>
          </Card>
        </div>
      )}
      {tab === "client" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_17em]">
          <Card><Reorder.Group axis="y" values={order} onReorder={setOrder} className="flex flex-col gap-2">{order.map((id) => <Reorder.Item key={id} value={id} className="flex cursor-grab items-center gap-3 rounded-lg border border-border bg-bg px-3 py-3 active:cursor-grabbing"><GripVertical className="size-4 text-text-muted" /><span className="text-base text-text">{CLIENT_QUESTIONS.find((q) => q.id === id)?.text}</span></Reorder.Item>)}</Reorder.Group><p className="mt-3 text-xs text-text-muted">Glissez pour réordonner.</p></Card>
          <div className="mx-auto w-[16em] rounded-[2em] border-[0.5em] border-ink bg-bg p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">SBS</p>{order.map((id) => <p key={id} className="mt-3 text-xs font-medium text-ink">{CLIENT_QUESTIONS.find((q) => q.id === id)?.text}</p>)}</div>
        </div>
      )}
      <Drawer open={!!editComp} onClose={() => setEditComp(null)} dirty title="Modifier la compétence" footer={<><Button variant="ghost" onClick={() => setEditComp(null)}>Annuler</Button><Button disabled={!cName.trim()} onClick={() => { act((d) => updateCompetency(d, me.id, editComp!, { name: cName.trim(), description: cDesc })); setEditComp(null); toast({ title: "Compétence enregistrée" }); }}>Enregistrer</Button></>}>
        <div className="flex flex-col gap-5"><TextInput label="Nom" required value={cName} onChange={setCName} /><TextArea label="Description" value={cDesc} onChange={setCDesc} rows={5} /></div>
      </Drawer>
      <Drawer open={!!qOpen} onClose={() => setQOpen(null)} title="Question" subtitle={qOpen ? s.competencies.find((c) => c.id === qOpen.competencyId)?.name ?? "Commentaire libre" : ""} width="38em" dirty={!!qOpen && text !== qOpen.variants[rel][band]} footer={<><Button variant="ghost" onClick={() => setQOpen(null)}>Fermer</Button><Button onClick={() => { act((d) => updateQuestion(d, me.id, qOpen!.id, rel, band, text)); toast({ title: "Formulation enregistrée", body: `${relationLabel[rel]} · ${BANDS.find((b) => b.value === band)?.label}` }); }}>Enregistrer cette variante</Button></>}>
        {qOpen && <div className="flex flex-col gap-5">
          <Tabs label="Relation" value={rel} onChange={(r) => pick(r, band)} items={(["RESPONSABLE", "PAIR", "EQUIPE"] as const).map((r) => ({ value: r, label: relationLabel[r] }))} />
          <SegmentedControl label="Niveau de grade" value={band} onChange={(b) => pick(rel, b)} options={BANDS} />
          <TextArea label="Formulation" value={text} onChange={setText} rows={5} />
          <div className="rounded-lg border border-border bg-canvas p-4"><p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Aperçu côté donneur</p><p className="text-base font-medium text-ink text-pretty">{text}</p></div>
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3"><span className="text-base text-text">Question active</span><Switch checked={qOpen.active} onChange={(v) => { act((d) => setQuestionActive(d, me.id, qOpen.id, v)); setQOpen({ ...qOpen, active: v }); }} label="Question active" /></div>
        </div>}
      </Drawer>
      <Modal open={prev} onClose={() => setPrev(false)} size="lg" title="Aperçu du formulaire" subtitle="Étape « Vos réponses » telle que la voit un donneur de feedback.">
        <div className="mb-4 flex flex-wrap gap-4"><SegmentedControl label="Relation" value={pRel} onChange={setPRel} options={(["RESPONSABLE", "PAIR", "EQUIPE"] as const).map((r) => ({ value: r, label: relationLabel[r] }))} /><SegmentedControl label="Grade" value={pGrade} onChange={setPGrade} options={BANDS} /></div>
        <ul className="flex flex-col gap-4">{collab.filter((q) => q.active).map((q) => <li key={q.id}><Badge tone="neutral">{s.competencies.find((c) => c.id === q.competencyId)?.name ?? "Commentaire libre"}</Badge><p className="mt-1.5 text-base font-medium text-ink text-pretty">{questionText(q, pRel, pGrade)}</p><div className="mt-2 h-14 rounded-md border border-border-strong bg-canvas" /></li>)}</ul>
        <span className="hidden">{gradeBand("Junior")}</span>
      </Modal>
    </Guard>
  );
}

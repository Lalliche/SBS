"use client";
import { Building2, Brain, DatabaseBackup, Eye, Lock, Mail, ShieldCheck, SlidersHorizontal, Users, VenetianMask, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { act } from "@/lib/store/store";
import { createBackup, logAdmin, logRestore, setAiMode } from "@/lib/store/actions";
import { fmtDate } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { feedbackAbout } from "@/lib/store/selectors";
import type { AppState, Settings, VisibilityRules } from "@/lib/store/types";
import { FeedbackCard } from "@/components/app/FeedbackCard";
import { Guard } from "@/components/app/Guard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SegmentedControl, SelectInput, Switch, TextInput } from "@/components/ui/FormInputs";
import { Drawer, Modal } from "@/components/ui/Overlay";
import { Callout, Card, CardHeader, PageHeader } from "@/components/ui/Surface";
import { useToast } from "@/components/ui/Toast";

type Section = "org" | "visibilite" | "notes" | "anonymat" | "ia" | "roles" | "messagerie" | "donnees";

const RULES: Array<{ key: keyof VisibilityRules; q: string; label: string; impact: (on: boolean) => string }> = [
  { key: "seeReceived", q: "Q1", label: "Le collaborateur voit les feedbacks qu’il a reçus", impact: (on) => (on ? "Chaque collaborateur consulte ses feedbacks reçus." : "Les feedbacks ne seront consultables qu’avec la synthèse.") },
  { key: "seeOwnSynthesis", q: "Q2", label: "Le collaborateur voit sa propre synthèse (une fois validée)", impact: (on) => (on ? "La synthèse validée devient visible par son sujet." : "Seul le responsable consulte la synthèse.") },
  { key: "showAuthorName", q: "Q3", label: "Le nom de l’auteur d’un feedback nominatif est montré au destinataire", impact: (on) => (on ? "Les feedbacks nominatifs affichent leur auteur." : "Les feedbacks nominatifs n’affichent plus leur auteur.") },
  { key: "leaderSeesAnonymous", q: "Q4", label: "Le responsable voit le contenu des feedbacks anonymes sur son équipe", impact: (on) => (on ? "Le responsable lit aussi les feedbacks anonymes." : "Le responsable ne voit que les feedbacks nominatifs.") },
  { key: "n1SeesSyntheses", q: "Q5", label: "Le N+1 du responsable voit les synthèses", impact: (on) => (on ? "Le niveau supérieur consulte les synthèses." : "Les synthèses restent entre le responsable et le collaborateur.") },
  { key: "rhSeesIndividual", q: "Q6", label: "L’Admin RH voit les feedbacks individuels et les synthèses", impact: (on) => (on ? "Les RH accèdent aux feedbacks individuels." : "Les RH voient uniquement des chiffres agrégés.") },
  { key: "seeClientFeedback", q: "Q7", label: "Le collaborateur voit les retours client sur sa mission", impact: (on) => (on ? "Les retours client sont visibles du collaborateur." : "Les retours client restent côté RH et responsable de mission.") },
  { key: "participantsSeeClient", q: "Q8", label: "Les participants voient tous les retours client de la mission", impact: (on) => (on ? "Tous les participants lisent les retours client." : "Les retours client sont restreints.") },
  { key: "allowAnonymousOnRequest", q: "Q9", label: "Un feedback demandé peut être anonyme", impact: (on) => (on ? "La réponse à une demande peut être anonyme." : "Les réponses aux demandes sont nominatives.") },
  { key: "showRelationOnAnonymous", q: "Q10", label: "La relation du donneur est affichée sur un feedback anonyme", impact: (on) => (on ? "Un feedback anonyme indique « Pair », « Équipe »…" : "Un feedback anonyme n’indique aucune relation.") },
  { key: "rhCanHideAnonymous", q: "Q11", label: "L’Admin RH peut masquer un texte anonyme inapproprié", impact: (on) => (on ? "Les RH peuvent masquer un texte (jamais l’identifier)." : "Aucun masquage n’est possible.") },
  { key: "anonymousCountsInQuota", q: "Q12", label: "Les feedbacks anonymes comptent dans les objectifs", impact: (on) => (on ? "Ils comptent dans l’anneau d’objectif." : "Seuls les feedbacks nominatifs comptent.") },
  { key: "anyoneCreatesMission", q: "Q13", label: "Tout collaborateur peut créer une mission", impact: (on) => (on ? "Le bouton « Nouvelle mission » est ouvert à tous." : "Seuls les RH créent des missions.") },
  { key: "feedbackWithoutMission", q: "Q14", label: "Un feedback peut être donné sans mission", impact: (on) => (on ? "« Aucune mission » est proposé dans l’assistant." : "Une mission est obligatoire.") },
  { key: "seeCompetencyAverage", q: "Q22", label: "Le collaborateur voit la moyenne par compétence", impact: (on) => (on ? "Les moyennes sont affichées au collaborateur." : "Les moyennes sont masquées au collaborateur.") },
  { key: "pdfForCollaborateur", q: "Q35", label: "Le PDF de la synthèse peut être remis au collaborateur", impact: (on) => (on ? "Le collaborateur peut exporter sa synthèse." : "Seul le responsable exporte le PDF.") },
  { key: "multipleLeaders", q: "Q41", label: "Autoriser plusieurs responsables par collaborateur", impact: (on) => (on ? "Un second champ « responsable » apparaît." : "Un seul responsable par collaborateur.") },
  { key: "radarByRelation", q: "Q21", label: "Radar par relation (Responsable, Pair, Équipe)", impact: (on) => (on ? "Le radar affiche un polygone par relation." : "Le radar n’affiche que l’ensemble.") },
];

function contrast(hex: string) {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (L + 0.05);
}

function PersonaPreview({ draft, onToggle }: { draft: Settings; onToggle: (k: keyof VisibilityRules, v: boolean) => void }) {
  const { s, cycle } = useSession();
  const [persona, setPersona] = useState("u-lucas");
  const pv: AppState = useMemo(() => ({ ...s, settings: draft }), [s, draft]);
  const v = draft.visibility;
  const received = feedbackAbout(pv, "u-lucas", cycle.id, persona === "u-thomas" ? "u-thomas" : "u-lucas");
  const sample = [received.find((x) => x.kind === "NOMINATIF"), received.find((x) => x.kind === "ANONYME")].filter(Boolean) as typeof received;
  const yes = (b: boolean) => <Badge tone={b ? "success" : "neutral"} dot>{b ? "Oui" : "Non"}</Badge>;
  return (
    <div className="grid gap-6 lg:grid-cols-[17em_1fr]">
      <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto pe-1 scroll-thin">
        {RULES.filter((r) => ["seeReceived", "showAuthorName", "leaderSeesAnonymous", "showRelationOnAnonymous", "seeOwnSynthesis", "rhSeesIndividual", "allowAnonymousOnRequest"].includes(r.key)).map((r) => (
          <li key={r.key} className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5"><span className="text-xs text-text"><b className="text-text-muted">{r.q}</b> {r.label}</span><Switch size="sm" checked={v[r.key]} onChange={(x) => onToggle(r.key, x)} label={r.label} /></li>
        ))}
      </ul>
      <div className="min-w-0">
        <SegmentedControl label="Personne" className="mb-4" value={persona} onChange={setPersona} options={[{ value: "u-lucas", label: "Lucas · Collaborateur" }, { value: "u-thomas", label: "Thomas · Responsable" }, { value: "u-sophie", label: "Sophie · Admin RH" }, { value: "u-claire", label: "Claire · Donneuse" }]} />
        <div className="rounded-xl border border-border bg-canvas p-4">
          {persona === "u-lucas" && <>
            <p className="mb-2 text-sm font-semibold text-ink">Mes feedbacks reçus</p>
            {!v.seeReceived ? <p className="rounded-md bg-paper px-3 py-3 text-sm text-text-secondary">Vos feedbacks seront consultables lors de la publication de votre synthèse.</p> : <div className="flex flex-col gap-3">{sample.map((f) => <FeedbackCard key={f.id} f={f} compact noActions />)}</div>}
            <ul className="mt-4 flex flex-col gap-2 text-sm text-text-secondary"><li className="flex items-center justify-between">Voit sa synthèse validée {yes(v.seeOwnSynthesis)}</li><li className="flex items-center justify-between">Voit les moyennes par compétence {yes(v.seeCompetencyAverage)}</li></ul>
          </>}
          {persona === "u-thomas" && <>
            <p className="mb-2 text-sm font-semibold text-ink">Feedbacks sur Lucas (équipe de Thomas)</p>
            <div className="flex flex-col gap-3">{sample.length ? sample.map((f) => <FeedbackCard key={f.id} f={f} compact noActions />) : <p className="text-sm text-text-muted">Aucun feedback visible.</p>}</div>
            <ul className="mt-4 flex flex-col gap-2 text-sm text-text-secondary"><li className="flex items-center justify-between">Lit les feedbacks anonymes {yes(v.leaderSeesAnonymous)}</li></ul>
          </>}
          {persona === "u-sophie" && <ul className="flex flex-col gap-3 text-base"><li className="flex items-center justify-between">Voit les feedbacks individuels {yes(v.rhSeesIndividual)}</li><li className="flex items-center justify-between">Peut masquer un texte anonyme {yes(v.rhCanHideAnonymous)}</li><li className="flex items-center justify-between">Peut identifier l’auteur d’un feedback anonyme <Badge tone="danger" dot>Jamais</Badge></li></ul>}
          {persona === "u-claire" && <ul className="flex flex-col gap-3 text-base"><li className="flex items-center justify-between">Peut répondre à une demande de façon anonyme {yes(v.allowAnonymousOnRequest)}</li><li className="flex items-center justify-between">La relation est montrée au destinataire {yes(v.showRelationOnAnonymous)}</li><li className="flex items-center justify-between">Son nom est visible sur un feedback nominatif {yes(v.showAuthorName)}</li></ul>}
        </div>
      </div>
    </div>
  );
}

export default function ParametresPage() {
  const { s, me, can } = useSession();
  const toast = useToast();
  const isRh = can("settings.org");
  const [section, setSection] = useState<Section>(isRh ? "visibilite" : "donnees");
  const [draft, setDraft] = useState<Settings>(() => structuredClone(s.settings));
  const [preview, setPreview] = useState(false);
  const [restore, setRestore] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [conn, setConn] = useState<"idle" | "testing" | "ok">("idle");
  const dirty = JSON.stringify(draft) !== JSON.stringify(s.settings);
  if (!me) return null;
  const setV = (k: keyof VisibilityRules, v: boolean) => setDraft((d) => ({ ...d, visibility: { ...d.visibility, [k]: v } }));
  const changes = RULES.filter((r) => draft.visibility[r.key] !== s.settings.visibility[r.key]);
  const save = () => {
    act((d) => {
      changes.forEach((r) => logAdmin(d, me.id, "Paramètres", "Règle de visibilité modifiée", `${r.q} — ${r.label}`, { before: s.settings.visibility[r.key] ? "Activé" : "Désactivé", after: draft.visibility[r.key] ? "Activé" : "Désactivé" }));
      if (JSON.stringify(draft.brand) !== JSON.stringify(s.settings.brand)) logAdmin(d, me.id, "Paramètres", "Marque modifiée", "Organisation & marque");
      if (draft.noteMode !== s.settings.noteMode || draft.noteRequired !== s.settings.noteRequired) logAdmin(d, me.id, "Paramètres", "Réglage des notes modifié", "Notes", { before: `${s.settings.noteMode} / obligatoire : ${s.settings.noteRequired}`, after: `${draft.noteMode} / obligatoire : ${draft.noteRequired}` });
      if (draft.sender !== s.settings.sender || draft.retentionDays !== s.settings.retentionDays) logAdmin(d, me.id, "Paramètres", "Réglage technique modifié", "Messagerie / sauvegardes");
      d.settings = draft;
    });
    toast({ title: "Modifications enregistrées", body: changes.length ? `${changes.length} règle(s) de visibilité mise(s) à jour.` : undefined });
  };
  const nav: Array<{ id: Section; label: string; icon: LucideIcon; show: boolean }> = [
    { id: "org", label: "Organisation & marque", icon: Building2, show: isRh },
    { id: "visibilite", label: "Règles de visibilité", icon: Eye, show: isRh },
    { id: "notes", label: "Notes", icon: SlidersHorizontal, show: isRh },
    { id: "anonymat", label: "Anonymat", icon: VenetianMask, show: isRh },
    { id: "ia", label: "Intelligence artificielle", icon: Brain, show: isRh },
    { id: "roles", label: "Utilisateurs & rôles", icon: Users, show: can("settings.tech") },
    { id: "messagerie", label: "Messagerie", icon: Mail, show: can("settings.tech") },
    { id: "donnees", label: "Données & sauvegarde", icon: DatabaseBackup, show: can("settings.tech") },
  ];
  return (
    <Guard any={["settings.org", "settings.tech"]}>
      <PageHeader title="Paramètres" description="Marque, règles de visibilité, notes, anonymat, IA et administration technique." />
      <div className="grid gap-8 lg:grid-cols-[15em_1fr]">
        <nav aria-label="Sections" className="lg:sticky lg:top-0 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">{nav.filter((n) => n.show).map((n) => <li key={n.id}><button type="button" onClick={() => setSection(n.id)} aria-current={section === n.id} className={cn("flex w-full items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-start text-base transition-colors focus-visible:shadow-none focus-visible:ring-2 focus-visible:ring-ink", section === n.id ? "bg-bg font-semibold text-ink shadow-xs" : "text-text-secondary hover:bg-bg hover:text-text")}><n.icon className="size-4" />{n.label}</button></li>)}</ul>
        </nav>
        <div className="min-w-0">
          {section === "org" && (
            <Card><CardHeader title="Organisation & marque" description="Raison sociale et couleurs, avec contrôle du contraste." />
              <div className="grid max-w-[40em] gap-5"><TextInput label="Raison sociale" value={draft.brand.name} onChange={(v) => setDraft({ ...draft, brand: { ...draft.brand, name: v } })} />
                <div className="grid gap-4 sm:grid-cols-3">{(["primary", "secondary", "accent"] as const).map((k) => <label key={k} className="flex flex-col gap-1.5 text-sm font-medium text-text">{{ primary: "Couleur principale", secondary: "Secondaire", accent: "Accent" }[k]}<span className="flex items-center gap-2 rounded-md border border-border-strong p-1.5"><input type="color" aria-label={k} value={draft.brand[k]} onChange={(e) => setDraft({ ...draft, brand: { ...draft.brand, [k]: e.target.value } })} className="size-7 cursor-pointer rounded border-0 bg-transparent p-0" /><span className="font-mono text-xs uppercase text-text-secondary">{draft.brand[k]}</span></span></label>)}</div>
                <div className="rounded-lg border border-border p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Aperçu</p><div className="flex flex-wrap items-center gap-3"><span className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ background: draft.brand.primary }}>Bouton principal</span><span className="rounded-md px-4 py-2 text-sm font-medium text-white" style={{ background: draft.brand.accent }}>Accent</span><span className="rounded-md border border-border px-4 py-2 text-sm" style={{ background: draft.brand.secondary }}>Fond secondaire</span></div>
                  <p className="mt-3 text-sm">Contraste texte blanc sur principal : <b className="tabular-nums">{contrast(draft.brand.primary).toFixed(1)} : 1</b> {contrast(draft.brand.primary) >= 4.5 ? <Badge tone="success" dot>AA</Badge> : <Badge tone="warning" dot>Insuffisant</Badge>}</p></div>
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-border-strong p-4 text-sm text-text-secondary"><Building2 className="size-5" /> Logo : fichier SBS actuel conservé. <Button size="sm" variant="secondary" onClick={() => toast({ title: "Aperçu", body: "Le téléversement de logo sera disponible en production.", tone: "info" })}>Remplacer</Button></div></div></Card>
          )}
          {section === "visibilite" && (
            <Card padded={false}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div><h2 className="text-md font-semibold text-ink">Règles de visibilité</h2><p className="text-sm text-text-secondary">Qui voit quoi. Toutes les règles sont paramétrables, sauf une.</p></div><Button icon={<Eye className="size-4" />} onClick={() => setPreview(true)}>Voir en tant que…</Button></div>
              <ul className="divide-y divide-border">
                {RULES.map((r) => { const on = draft.visibility[r.key]; const changed = on !== s.settings.visibility[r.key]; return (
                  <li key={r.key} className={cn("flex items-start justify-between gap-6 px-5 py-3.5", changed && "bg-warning-bg/50")}><div className="min-w-0"><p className="text-base text-text"><span className="me-2 text-xs font-semibold text-text-muted">{r.q}</span>{r.label}</p><p className="mt-0.5 text-sm text-text-secondary">{r.impact(on)}</p></div><Switch checked={on} onChange={(v) => setV(r.key, v)} label={r.label} /></li>
                ); })}
                <li className="flex items-start justify-between gap-6 bg-canvas px-5 py-3.5"><div><p className="text-base font-medium text-ink">Auteur d’un feedback anonyme</p><p className="mt-0.5 text-sm text-text-secondary">Jamais visible, pour personne — pas même les administrateurs. Cette règle ne peut pas être modifiée.</p></div><span title="Auteur d’un feedback anonyme : jamais visible" className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-white"><Lock className="size-3" /> Verrouillé</span></li>
              </ul>
            </Card>
          )}
          {section === "notes" && (
            <Card><CardHeader title="Notes" description="Les réponses écrites passent d’abord ; la note de 1 à 5 est facultative." /><div className="flex max-w-[40em] flex-col gap-5">
              <div><p className="mb-1.5 text-sm font-medium text-text">Mode de notation</p><SegmentedControl label="Mode de notation" value={draft.noteMode} onChange={(v) => setDraft({ ...draft, noteMode: v })} options={[{ value: "PAR_COMPETENCE", label: "Par compétence" }, { value: "PAR_MISSION", label: "Par mission" }]} /></div>
              <div className="flex items-center justify-between"><span className="text-base text-text">Note obligatoire</span><Switch checked={draft.noteRequired} onChange={(v) => setDraft({ ...draft, noteRequired: v })} label="Note obligatoire" /></div>
              <div className="flex items-center justify-between"><span className="text-base text-text">Radar par relation</span><Switch checked={draft.visibility.radarByRelation} onChange={(v) => setV("radarByRelation", v)} label="Radar par relation" /></div>
              <Callout tone="neutral">Aucune pondération ni score global : les moyennes sont toujours simples.</Callout></div></Card>
          )}
          {section === "anonymat" && (
            <div className="flex flex-col gap-6">
              <Card><CardHeader title="Comment l’anonymat est garanti" /><p className="max-w-[44em] text-base leading-relaxed text-text-secondary text-pretty">Un feedback anonyme est écrit dans un espace séparé par une fonction qui ne reçoit jamais l’identité de l’auteur. Les exports, les sauvegardes, le journal et les aperçus utilisent les mêmes données : la garantie vaut partout.</p><Link href="/app/aide/anonymat" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-ink underline underline-offset-4 hover:text-accent"><ShieldCheck className="size-4" /> Voir le schéma</Link></Card>
              <Card padded={false}><ul className="divide-y divide-border">{RULES.filter((r) => ["showRelationOnAnonymous", "rhCanHideAnonymous", "anonymousCountsInQuota"].includes(r.key)).map((r) => <li key={r.key} className="flex items-start justify-between gap-6 px-5 py-3.5"><div><p className="text-base text-text"><span className="me-2 text-xs font-semibold text-text-muted">{r.q}</span>{r.label}</p><p className="mt-0.5 text-sm text-text-secondary">{r.impact(draft.visibility[r.key])}</p></div><Switch checked={draft.visibility[r.key]} onChange={(v) => setV(r.key, v)} label={r.label} /></li>)}<li className="flex items-center justify-between gap-6 bg-canvas px-5 py-3.5"><p className="text-base font-medium text-ink">Personne ne peut retrouver l’auteur d’un feedback anonyme</p><span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-white"><Lock className="size-3" /> Verrouillé</span></li></ul></Card>
            </div>
          )}
          {section === "ia" && (() => { const cy = s.cycles.find((c) => c.status === "OUVERT") ?? s.cycles[0]; return (
            <Card><CardHeader title="Intelligence artificielle" description="Option activable et désactivable à tout moment." /><div className="flex max-w-[42em] flex-col gap-5">
              <div className="flex items-center justify-between"><span className="text-base text-text">Activer l’assistant IA</span><Switch checked={cy.aiMode !== "OFF"} onChange={(v) => { act((d) => setAiMode(d, me.id, v ? "ASSISTE" : "OFF")); toast({ title: v ? "Assistant IA activé" : "Assistant IA désactivé" }); }} label="Activer l’assistant IA" /></div>
              <SegmentedControl label="Mode" value={cy.aiMode === "OFF" ? "MANUEL" : cy.aiMode} onChange={(v) => act((d) => setAiMode(d, me.id, v))} options={[{ value: "MANUEL", label: "Rédaction par le responsable seul" }, { value: "ASSISTE", label: "Rédaction assistée par l’IA" }]} />
              <Callout tone="info">L’IA ne modifie jamais une note et ne publie rien sans validation du responsable.</Callout></div></Card>); })()}
          {section === "roles" && <Card><CardHeader title="Utilisateurs & rôles" /><p className="text-base text-text-secondary">Attribuez les rôles depuis la page dédiée. Au moins un Admin RH doit rester actif.</p><Button className="mt-4" href="/app/utilisateurs">Gérer les utilisateurs</Button></Card>}
          {section === "messagerie" && (
            <Card><CardHeader title="Messagerie" /><div className="flex max-w-[34em] flex-col gap-5"><TextInput label="Adresse d’expédition" value={draft.sender} onChange={(v) => setDraft({ ...draft, sender: v })} />
              <div className="flex items-center justify-between rounded-lg border border-border p-4"><div><p className="text-base font-medium text-ink">Connexion au serveur d’envoi</p><p className="text-sm text-text-secondary">{conn === "ok" ? "Connexion établie." : conn === "testing" ? "Test en cours…" : "Non testée."}</p></div><Button variant="secondary" loading={conn === "testing"} onClick={() => { setConn("testing"); setTimeout(() => { setConn("ok"); toast({ title: "Connexion réussie" }); }, 1100); }}>Tester la connexion</Button></div></div></Card>
          )}
          {section === "donnees" && (
            <Card padded={false}>
              <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="text-md font-semibold text-ink">Données & sauvegarde</h2><p className="text-sm text-text-secondary">Sauvegarde quotidienne automatique, conservation {draft.retentionDays} jours.</p></div><Button icon={<DatabaseBackup className="size-4" />} onClick={() => { act((d) => createBackup(d, me.id)); toast({ title: "Sauvegarde créée" }); }}>Créer une sauvegarde</Button></div>
              <ul className="divide-y divide-border">{s.backups.map((b) => <li key={b.id} className="flex items-center gap-4 px-5 py-3"><DatabaseBackup className="size-4 text-text-muted" /><span className="flex-1 text-base text-text">{fmtDate(b.ts)} <span className="text-text-muted">· {b.sizeKb} Ko</span></span><Badge tone={b.kind === "AUTO" ? "neutral" : "info"}>{b.kind === "AUTO" ? "Automatique" : "Manuelle"}</Badge><Button size="sm" variant="ghost" onClick={() => toast({ title: "Téléchargement lancé" })}>Télécharger</Button><Button size="sm" variant="secondary" onClick={() => { setRestore(b.id); setTyped(""); }}>Restaurer</Button></li>)}</ul>
              <div className="border-t border-border px-5 py-4"><div className="max-w-[16em]"><SelectInput label="Durée de conservation" value={String(draft.retentionDays)} onChange={(v) => setDraft({ ...draft, retentionDays: Number(v) })} options={[{ value: "30", label: "30 jours" }, { value: "90", label: "90 jours" }, { value: "365", label: "365 jours" }]} /></div></div>
            </Card>
          )}
        </div>
      </div>
      {dirty && (
        <div role="region" aria-label="Enregistrer les modifications" className="no-print sticky bottom-0 z-40 -mx-4 mt-6 flex items-center justify-end gap-3 border-t border-border bg-bg/95 px-4 py-3 shadow-lg backdrop-blur sm:-mx-8 sm:px-8">
          <span className="me-auto text-sm text-text-secondary">Des modifications ne sont pas enregistrées.</span>
          <Button variant="ghost" onClick={() => setDraft(structuredClone(s.settings))}>Annuler</Button>
          <Button onClick={save}>Enregistrer les modifications</Button>
        </div>
      )}
      <Drawer open={preview} onClose={() => setPreview(false)} width="64em" title="Voir en tant que…" subtitle="Aperçu en direct : basculez une règle, l’écran de la personne se met à jour.">
        <PersonaPreview draft={draft} onToggle={setV} />
        <p className="mt-6 text-xs text-text-muted">Les changements ne sont appliqués qu’après « Enregistrer les modifications ».</p>
      </Drawer>
      <Modal open={!!restore} onClose={() => setRestore(null)} title="Restaurer cette sauvegarde ?" footer={<><Button variant="ghost" onClick={() => setRestore(null)}>Annuler</Button><Button variant="danger" disabled={typed !== "RESTAURER"} onClick={() => { act((d) => logRestore(d, me.id, restore!)); setRestore(null); toast({ title: "Restauration planifiée", body: "Aperçu : aucune donnée n’a été modifiée.", tone: "info" }); }}>Restaurer</Button></>}>
        <Callout tone="danger" title="Action à fort impact">Les données postérieures à cette sauvegarde seraient perdues. Tous les utilisateurs seraient déconnectés.</Callout>
        <div className="mt-4"><TextInput label="Tapez RESTAURER pour confirmer" value={typed} onChange={setTyped} /></div>
      </Modal>
    </Guard>
  );
}

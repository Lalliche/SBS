"use client";
import { Check, Download, FileUp, MoreHorizontal, UserMinus, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { act } from "@/lib/store/store";
import { addUser, setLeader, setUserStatus } from "@/lib/store/actions";
import { fullName, roleLabel } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { quotaFor } from "@/lib/store/selectors";
import { useQueryState } from "@/lib/use-query-state";
import type { Grade, User } from "@/lib/store/types";
import { Guard } from "@/components/app/Guard";
import { ProgressRing } from "@/components/charts/Ring";
import { Avatar, PersonChip } from "@/components/ui/Avatar";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { DataTable, SavedViews } from "@/components/ui/DataTable";
import { SearchInput, SelectInput, Switch, TextInput } from "@/components/ui/FormInputs";
import { Drawer, Modal } from "@/components/ui/Overlay";
import { MenuItem, Popover } from "@/components/ui/Popover";
import { Callout, EmptyState, PageHeader } from "@/components/ui/Surface";
import { useToast } from "@/components/ui/Toast";

const GRADES: Grade[] = ["Junior", "Consultant", "Senior", "Manager", "Directeur"];

function ImportWizard({ onClose }: { onClose: () => void }) {
  const { s, me } = useSession();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<string | null>(null);
  const rows = [
    { m: "SBS-2101", n: "Amira Boukhari", e: "amira.boukhari@sbsfirm.example", d: "Strategy & Consulting", ok: true, note: "" },
    { m: "SBS-2102", n: "Walid Ouali", e: "walid.ouali@sbsfirm.example", d: "Engineering & Tech", ok: true, note: "" },
    { m: "SBS-1007", n: "Karim Doublon", e: "k.doublon@sbsfirm.example", d: "Finance & Operations", ok: false, note: "Matricule déjà utilisé (SBS-1007)" },
    { m: "SBS-2104", n: "Sofiane Kaci", e: "sofiane.kaci@sbsfirm.example", d: "People & HR", ok: false, note: "Responsable inconnu" },
    { m: "SBS-2105", n: "Yasmine Belkacem", e: "yasmine.belkacem@sbsfirm.example", d: "Strategy & Consulting", ok: true, note: "" },
  ];
  const [fixed, setFixed] = useState<Record<string, boolean>>({});
  const good = rows.filter((r) => r.ok || fixed[r.m]);
  const run = () => {
    good.forEach((r) => {
      const [first, ...rest] = r.n.split(" ");
      const dept = s.departments.find((d) => d.name === r.d)!;
      act((d) => addUser(d, me!.id, { matricule: r.m, firstName: first, lastName: rest.join(" "), email: r.e, departmentId: dept.id, jobTitle: "Consultant", grade: "Consultant", leaderIds: [] }));
    });
    setStep(3);
  };
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-canvas" role="dialog" aria-modal="true" aria-label="Importer des collaborateurs">
      <header className="flex h-14 items-center justify-between border-b border-border bg-bg px-6"><p className="text-md font-semibold text-ink">Importer des collaborateurs</p><Button variant="ghost" size="sm" icon={<X className="size-4" />} onClick={onClose}>Fermer</Button></header>
      <div className="mx-auto w-full max-w-[56em] flex-1 overflow-y-auto px-6 py-8">
        <ol className="mb-6 flex flex-wrap gap-2">{["Fichier", "Colonnes", "Validation", "Résultat"].map((t, i) => <li key={t} className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-sm", i === step ? "bg-ink text-white" : i < step ? "bg-paper text-ink" : "text-text-muted")}>{i < step ? <Check className="size-3.5" /> : <span className="tabular-nums">{i + 1}</span>}{t}</li>)}</ol>
        <div className="rounded-xl border border-border bg-bg p-6 sm:p-8">
          {step === 0 && <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border-strong p-10 text-center"><FileUp className="size-8 text-text-muted" /><p className="text-md font-medium text-ink">{file ?? "Déposez un fichier Excel ou CSV"}</p><div className="flex gap-2"><Button onClick={() => setFile("collaborateurs-sbs.xlsx")}>{file ? "Remplacer le fichier" : "Choisir un fichier"}</Button><Button variant="secondary" icon={<Download className="size-4" />} onClick={() => toast({ title: "Modèle téléchargé" })}>Télécharger le modèle</Button></div></div>}
          {step === 1 && <div className="flex flex-col gap-3"><p className="text-sm text-text-secondary">Associez les colonnes de votre fichier aux champs de la plateforme.</p>{[["Matricule", "matricule"], ["Nom complet", "nom"], ["E-mail", "email"], ["Département", "departement"], ["Responsable", "responsable"]].map(([l, c]) => <div key={l} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-border px-4 py-2.5 text-base"><span>{l}</span><span className="text-text-muted">→</span><span className="rounded bg-paper px-2 py-1 text-sm font-medium">{c}</span></div>)}</div>}
          {step === 2 && <div className="flex flex-col gap-3"><p className="text-sm text-text-secondary">{good.length} ligne(s) valides, {rows.length - good.length} à corriger.</p><ul className="divide-y divide-border rounded-lg border border-border">{rows.map((r) => { const ok = r.ok || fixed[r.m]; return <li key={r.m} className="flex items-center gap-3 px-4 py-3"><span className={cn("flex size-5 items-center justify-center rounded-full", ok ? "bg-success text-white" : "bg-danger-bg text-danger")}>{ok ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" />}</span><span className="w-24 text-sm tabular-nums text-text-muted">{r.m}</span><span className="flex-1 text-base text-ink">{r.n}<span className="block text-xs text-text-muted">{r.d}</span></span>{!ok && <><span className="text-sm text-danger">{r.note}</span><Button size="sm" variant="secondary" onClick={() => setFixed({ ...fixed, [r.m]: true })}>Corriger</Button></>}</li>; })}</ul></div>}
          {step === 3 && <div className="flex flex-col items-center gap-3 py-6 text-center"><span className="flex size-12 items-center justify-center rounded-full bg-success-bg text-success"><Check className="size-6" /></span><p className="text-lg font-semibold text-ink">{good.length} collaborateurs importés</p><p className="text-sm text-text-secondary">{rows.length - good.length} ligne(s) ignorée(s). Un rapport d’erreurs est disponible.</p><Button variant="secondary" icon={<Download className="size-4" />} onClick={() => toast({ title: "Rapport d’erreurs téléchargé" })}>Rapport d’erreurs</Button></div>}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            {step < 3 ? <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>Retour</Button> : <span />}
            {step === 0 && <Button disabled={!file} onClick={() => setStep(1)}>Continuer</Button>}
            {step === 1 && <Button onClick={() => setStep(2)}>Continuer</Button>}
            {step === 2 && <Button disabled={!good.length} onClick={run}>Importer {good.length} ligne{good.length > 1 ? "s" : ""}</Button>}
            {step === 3 && <Button onClick={onClose}>Terminer</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CollaborateursPage() {
  const { s, me, can, cycle } = useSession();
  const toast = useToast();
  const qs = useQueryState();
  const [view, setView] = useState<"all" | "actifs" | "sans" | "resp">("all");
  const [q, setQ] = useState(qs.get("q"));
  const [profile, setProfile] = useState<User | null>(null);
  const [add, setAdd] = useState(false);
  const [imp, setImp] = useState(false);
  const [deact, setDeact] = useState<User[] | null>(null);
  const [leaderFor, setLeaderFor] = useState<User[] | null>(null);
  const [newLeader, setNewLeader] = useState("");
  const [f, setF] = useState({ matricule: "", firstName: "", lastName: "", email: "", departmentId: "d-strategy", jobTitle: "", grade: "Consultant" as Grade, leader: "" });
  const [touched, setTouched] = useState(false);
  const [multi, setMulti] = useState("");
  const edit = can("referentials.edit");
  const rows = useMemo(() => s.users.filter((u) => (view === "actifs" ? u.status === "ACTIF" : view === "sans" ? !u.leaderIds.length && u.status === "ACTIF" : view === "resp" ? s.users.some((x) => x.leaderIds.includes(u.id)) : true) && (me?.role === "RESPONSABLE" ? u.leaderIds.includes(me.id) : true) && fullName(u).toLowerCase().includes(q.trim().toLowerCase())), [s.users, view, q, me]);
  if (!me) return null;
  const dup = s.users.find((u) => f.matricule && u.matricule.toLowerCase() === f.matricule.toLowerCase()) ?? s.users.find((u) => f.email && u.email.toLowerCase() === f.email.toLowerCase());
  const errs = { matricule: !f.matricule ? "Obligatoire" : null, firstName: !f.firstName ? "Obligatoire" : null, lastName: !f.lastName ? "Obligatoire" : null, email: !/.+@.+/.test(f.email) ? "E-mail invalide" : null, jobTitle: !f.jobTitle ? "Obligatoire" : null };
  const save = (again: boolean) => {
    setTouched(true);
    if (Object.values(errs).some(Boolean) || dup) return;
    act((d) => addUser(d, me.id, { matricule: f.matricule, firstName: f.firstName, lastName: f.lastName, email: f.email, departmentId: f.departmentId, jobTitle: f.jobTitle, grade: f.grade, leaderIds: f.leader ? [f.leader] : [] }));
    toast({ title: "Collaborateur ajouté", body: `${f.firstName} ${f.lastName}` });
    setTouched(false);
    setF({ ...f, matricule: "", firstName: "", lastName: "", email: "", jobTitle: "" });
    if (!again) setAdd(false);
  };
  const impact = (list: User[]) => ({ missions: s.missions.filter((m) => m.status === "EN_COURS" && list.some((u) => m.participantIds.includes(u.id))).length, team: s.users.filter((u) => list.some((l) => u.leaderIds.includes(l.id))).length });
  return (
    <Guard action="users.directory">
      <PageHeader title="Collaborateurs" description={me.role === "RESPONSABLE" ? "Les membres de votre équipe." : "L’annuaire : poste, grade, département et responsable."} actions={edit ? <><Button variant="secondary" icon={<FileUp className="size-4" />} onClick={() => setImp(true)}>Importer</Button><Button icon={<UserPlus className="size-4" />} onClick={() => setAdd(true)}>Ajouter un collaborateur</Button></> : undefined} />
      <SavedViews value={view} onChange={setView} views={[{ value: "all", label: "Tous" }, { value: "actifs", label: "Actifs" }, { value: "sans", label: "Sans responsable" }, { value: "resp", label: "Responsables" }]} />
      <DataTable<User>
        caption="Annuaire des collaborateurs"
        rows={rows}
        getId={(u) => u.id}
        selectable={edit}
        onRowClick={setProfile}
        toolbar={<SearchInput value={q} onChange={setQ} placeholder="Rechercher un collaborateur…" className="w-[20em]" />}
        bulk={(sel, clear) => <><Button size="sm" variant="inverse" onClick={() => setLeaderFor(sel)}>Changer de responsable</Button><Button size="sm" variant="inverse" onClick={() => setDeact(sel)}>Désactiver</Button><Button size="sm" variant="inverse" onClick={() => { toast({ title: `${sel.length} ligne(s) exportée(s)` }); clear(); }}>Exporter</Button></>}
        empty={<EmptyState icon={UserMinus} title="Aucun collaborateur ne correspond" />}
        columns={[
          { key: "n", header: "Collaborateur", sort: (a, b) => a.lastName.localeCompare(b.lastName), cell: (u) => <PersonChip user={u} dept={s.departments.find((d) => d.id === u.departmentId)} sub={u.email} /> },
          { key: "d", header: "Département", hideBelow: "md", cell: (u) => s.departments.find((d) => d.id === u.departmentId)?.name },
          { key: "j", header: "Poste", hideBelow: "lg", cell: (u) => <span className="text-text-secondary">{u.jobTitle}</span> },
          { key: "g", header: "Grade", hideBelow: "lg", cell: (u) => <Badge tone="neutral">{u.grade}</Badge> },
          { key: "r", header: "Responsable", hideBelow: "md", cell: (u) => { const l = s.users.find((x) => u.leaderIds.includes(x.id)); return l ? fullName(l) : <span className="text-warning">Aucun</span>; } },
          { key: "s", header: "Statut", cell: (u) => <StatusPill status={u.status} /> },
        ]}
        rowActions={edit ? (u) => (
          <Popover label="Actions" trigger={({ toggle, ref }) => <IconButton ref={ref} label="Actions" size="sm" onClick={toggle}><MoreHorizontal className="size-4" /></IconButton>}>
            {(close) => <div role="menu" className="min-w-[14em] py-1"><MenuItem onClick={() => { close(); setProfile(u); }}>Ouvrir le profil</MenuItem><MenuItem onClick={() => { close(); setLeaderFor([u]); }}>Changer de responsable</MenuItem>{u.status === "ACTIF" ? <MenuItem danger onClick={() => { close(); setDeact([u]); }}>Désactiver</MenuItem> : <MenuItem onClick={() => { close(); act((d) => setUserStatus(d, me.id, u.id, "ACTIF")); toast({ title: "Collaborateur réactivé" }); }}>Réactiver</MenuItem>}</div>}
          </Popover>
        ) : undefined}
      />
      <Drawer open={!!profile} onClose={() => setProfile(null)} title={profile ? fullName(profile) : ""} subtitle={profile?.jobTitle} width="32em">
        {profile && (() => { const q2 = quotaFor(s, profile.id, cycle.id); const l = s.users.find((x) => profile.leaderIds.includes(x.id)); const team = s.users.filter((x) => x.leaderIds.includes(profile.id)); return (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4"><Avatar user={profile} dept={s.departments.find((d) => d.id === profile.departmentId)} size="xl" /><div><p className="text-md font-semibold text-ink">{fullName(profile)}</p><p className="text-sm text-text-secondary">{roleLabel[profile.role]}</p><StatusPill status={profile.status} /></div></div>
            <dl className="grid grid-cols-2 gap-4 text-sm">{[["Matricule", profile.matricule], ["Grade", profile.grade], ["Département", s.departments.find((d) => d.id === profile.departmentId)?.name], ["Responsable", l ? fullName(l) : "—"], ["E-mail", profile.email]].map(([k, v]) => <div key={k as string} className={k === "E-mail" ? "col-span-2" : ""}><dt className="text-xs text-text-muted">{k}</dt><dd className="mt-0.5 font-medium text-ink">{v}</dd></div>)}</dl>
            <div className="flex items-center gap-5 rounded-lg bg-canvas p-4"><ProgressRing value={q2.ratio} size="4.5em" tone={q2.reached ? "success" : "ink"} label="Objectif"><span className="text-md font-semibold tabular-nums">{q2.received}</span></ProgressRing><div><p className="text-sm text-text-secondary">Objectif du cycle</p><p className="text-md font-semibold text-ink tabular-nums">{q2.received} / {q2.target}</p></div></div>
            {team.length > 0 && <div><p className="mb-2 text-sm font-semibold text-ink">Équipe ({team.length})</p><ul className="flex flex-col gap-2">{team.map((t) => <li key={t.id}><PersonChip user={t} dept={s.departments.find((d) => d.id === t.departmentId)} /></li>)}</ul></div>}
            <div><p className="mb-2 text-sm font-semibold text-ink">Missions</p><ul className="flex flex-col gap-1.5 text-sm text-text-secondary">{s.missions.filter((m) => m.participantIds.includes(profile.id)).slice(0, 5).map((m) => <li key={m.id}>• {m.name}</li>)}</ul></div>
            {s.settings.visibility.multipleLeaders && <Callout tone="info">Plusieurs responsables par collaborateur sont autorisés (réglage RH).</Callout>}
          </div>); })()}
      </Drawer>
      <Drawer open={add} onClose={() => setAdd(false)} dirty={!!(f.firstName || f.lastName || f.matricule)} title="Ajouter un collaborateur" width="34em" footer={<><Button variant="ghost" onClick={() => setAdd(false)}>Annuler</Button><span className="flex gap-2"><Button variant="secondary" onClick={() => save(true)}>Enregistrer et ajouter un autre</Button><Button onClick={() => save(false)}>Enregistrer</Button></span></>}>
        <div className="flex flex-col gap-4">
          <TextInput label="Matricule" required value={f.matricule} onChange={(v) => setF({ ...f, matricule: v })} error={touched ? errs.matricule : null} />
          <div className="grid grid-cols-2 gap-4"><TextInput label="Prénom" required value={f.firstName} onChange={(v) => setF({ ...f, firstName: v })} error={touched ? errs.firstName : null} /><TextInput label="Nom" required value={f.lastName} onChange={(v) => setF({ ...f, lastName: v })} error={touched ? errs.lastName : null} /></div>
          <TextInput label="E-mail" required value={f.email} onChange={(v) => setF({ ...f, email: v })} error={touched ? errs.email : null} />
          <SelectInput label="Département" required value={f.departmentId} onChange={(v) => setF({ ...f, departmentId: v })} options={s.departments.map((d) => ({ value: d.id, label: d.name }))} />
          <TextInput label="Poste" required value={f.jobTitle} onChange={(v) => setF({ ...f, jobTitle: v })} error={touched ? errs.jobTitle : null} />
          <SelectInput label="Grade" required value={f.grade} onChange={(v) => setF({ ...f, grade: v })} options={GRADES.map((g) => ({ value: g, label: g }))} />
          <SelectInput label="Responsable" value={f.leader} onChange={(v) => setF({ ...f, leader: v })} placeholder="Aucun" options={[{ value: "", label: "Aucun" }, ...s.users.filter((u) => s.users.some((x) => x.leaderIds.includes(u.id)) || u.role === "RESPONSABLE").map((u) => ({ value: u.id, label: fullName(u) }))]} />
          {s.settings.visibility.multipleLeaders && <SelectInput label="Second responsable" value={multi} onChange={setMulti} options={[{ value: "", label: "Aucun" }, ...s.users.filter((u) => u.role === "RESPONSABLE").map((u) => ({ value: u.id, label: fullName(u) }))]} />}
          {dup && touched && <Callout tone="danger" title="Doublon détecté">Un collaborateur existe déjà avec ce matricule ou cet e-mail : {fullName(dup)}.</Callout>}
        </div>
      </Drawer>
      {imp && <ImportWizard onClose={() => setImp(false)} />}
      <Modal open={!!deact} onClose={() => setDeact(null)} title="Désactiver ces collaborateurs ?" footer={<><Button variant="ghost" onClick={() => setDeact(null)}>Annuler</Button><Button variant="danger" onClick={() => { const list = deact!; list.forEach((u) => act((d) => setUserStatus(d, me.id, u.id, "INACTIF"))); setDeact(null); toast({ title: `${list.length} désactivé${list.length > 1 ? "s" : ""}`, undo: () => list.forEach((u) => act((d) => setUserStatus(d, me.id, u.id, "ACTIF"))) }); }}>Désactiver</Button></>}>
        {deact && <><p className="text-base text-text">Impact :</p><ul className="mt-2 flex flex-col gap-1.5 text-sm text-text-secondary"><li>• {impact(deact).missions} mission(s) en cours concernée(s)</li><li>• {impact(deact).team} collaborateur(s) à réaffecter à un autre responsable</li><li>• L’historique des feedbacks est conservé</li></ul></>}
      </Modal>
      <Modal open={!!leaderFor} onClose={() => setLeaderFor(null)} title="Changer de responsable" subtitle={`${leaderFor?.length ?? 0} collaborateur(s)`} footer={<><Button variant="ghost" onClick={() => setLeaderFor(null)}>Annuler</Button><Button disabled={!newLeader} onClick={() => { act((d) => setLeader(d, me.id, leaderFor!.map((u) => u.id), newLeader)); setLeaderFor(null); toast({ title: "Responsable modifié" }); }}>Appliquer</Button></>}>
        <SelectInput label="Nouveau responsable" value={newLeader} onChange={setNewLeader} placeholder="Choisir" options={s.users.filter((u) => u.status === "ACTIF").map((u) => ({ value: u.id, label: fullName(u) }))} />
      </Modal>
    </Guard>
  );
}
export const _c = { Switch };

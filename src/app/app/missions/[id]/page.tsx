"use client";
import { Check, Link2, Plus, Sparkles, UserPlus } from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import { use, useMemo, useState } from "react";
import { act } from "@/lib/store/store";
import { completeMission, setParticipants, updateMission } from "@/lib/store/actions";
import { clientLinkValidity, fmtDate, fmtDateLong, fullName, relDate, relationLabel, relationOf } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { missionFeedbackCount } from "@/lib/store/selectors";
import type { User } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { Guard } from "@/components/app/Guard";
import { PeoplePicker } from "@/components/app/PeoplePicker";
import { useShell } from "@/components/app/ShellContext";
import { Avatar, PersonChip } from "@/components/ui/Avatar";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/FormInputs";
import { Modal } from "@/components/ui/Overlay";
import { Callout, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/Surface";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { Kpi } from "@/components/app/Kpi";

type Tab = "apercu" | "participants" | "feedbacks" | "client" | "parametres";

export default function MissionPage({ params }: PageProps<"/app/missions/[id]">) {
  const { id } = use(params);
  const { s, me, can, readOnly } = useSession();
  const router = useRouter();
  const shell = useShell();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("apercu");
  const [suggest, setSuggest] = useState(false);
  const [add, setAdd] = useState(false);
  const [addIds, setAddIds] = useState<string[]>([]);
  const [finish, setFinish] = useState(false);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const m = s.missions.find((x) => x.id === id);
  const [form, setForm] = useState(() => ({ name: m?.name ?? "", description: m?.description ?? "", leadId: m?.leadId ?? "" }));
  const participants = useMemo(() => (m ? s.users.filter((u) => m.participantIds.includes(u.id)) : []), [m, s.users]);
  if (!m || !me) return me ? notFound() : null;
  const lead = s.users.find((u) => u.id === m.leadId);
  const canEdit = (can("mission.create") || m.leadId === me.id) && !readOnly;
  const isParticipant = m.participantIds.includes(me.id);
  const requests = s.requests.filter((r) => r.missionId === m.id);
  const pendingCount = s.tasks.filter((t) => t.status === "EN_ATTENTE" && requests.some((r) => r.id === t.requestId)).length;
  const links = s.clientLinks.filter((l) => l.missionId === m.id);
  const responses = s.clientResponses.filter((r) => r.missionId === m.id);

  const suggestionsFor = (p: User) => {
    const others = participants.filter((u) => u.id !== p.id);
    const chips: Array<{ user: User; why: string }> = [];
    const L = others.find((u) => u.id === m.leadId);
    if (L) chips.push({ user: L, why: "Responsable de mission" });
    others.filter((u) => u.id !== m.leadId).slice(0, 4).forEach((u) => {
      const r = relationOf(u, p);
      chips.push({ user: u, why: r ? relationLabel[r] : "Collègue" });
    });
    return chips.slice(0, 5);
  };

  const timeline = [
    { ts: m.startDate, text: "Mission démarrée", tone: "ink" as const },
    ...requests.map((r) => ({ ts: r.createdAt, text: `${fullName(s.users.find((u) => u.id === r.requesterId)!)} a demandé ${r.recipientIds.length} feedback${r.recipientIds.length > 1 ? "s" : ""}`, tone: "info" as const })),
    ...responses.map((r) => ({ ts: r.createdAt, text: "Retour client reçu", tone: "accent" as const })),
    ...(m.status === "TERMINEE" ? [{ ts: m.endDate, text: "Mission terminée", tone: "ink" as const }] : []),
  ].sort((a, b) => b.ts.localeCompare(a.ts));

  return (
    <Guard any={["mission.viewAll", "feedback.give"]}>
      <PageHeader
        breadcrumb={[{ label: "Missions", href: "/app/missions" }, { label: m.name }]}
        title={m.name}
        description={<span className="flex flex-wrap items-center gap-2"><StatusPill status={m.status} /> {fmtDate(m.startDate)} → {fmtDate(m.endDate)}</span>}
        actions={isParticipant && !readOnly ? <Button onClick={() => shell.openRequest({ missionId: m.id })}>Demander un feedback</Button> : undefined}
      />
      <Tabs label="Mission" className="mb-6" value={tab} onChange={setTab} items={[{ value: "apercu", label: "Aperçu" }, { value: "participants", label: "Participants", count: participants.length }, { value: "feedbacks", label: "Feedbacks" }, ...(can("clientlink.manage") || m.leadId === me.id ? [{ value: "client" as const, label: "Feedback client" }] : []), ...(canEdit ? [{ value: "parametres" as const, label: "Paramètres" }] : [])]} />

      {tab === "apercu" && (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-6">
            <Card><CardHeader title="Description" /><p className="text-base leading-relaxed text-text-secondary text-pretty">{m.description || "Aucune description."}</p>{lead && <div className="mt-5 flex items-center gap-3 border-t border-border pt-4"><span className="text-sm text-text-muted">Responsable de mission</span><PersonChip user={lead} dept={s.departments.find((d) => d.id === lead.departmentId)} /></div>}</Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <Kpi label="Feedbacks" value={missionFeedbackCount(s, m.id)} hint="nominatifs et anonymes" />
              <Kpi label="Demandes en attente" value={pendingCount} hint={`${requests.length} demande${requests.length > 1 ? "s" : ""} au total`} />
            </div>
          </div>
          <Card>
            <CardHeader title="Activité" />
            <ol className="relative flex flex-col gap-5 ps-5 before:absolute before:inset-y-1 before:start-[0.3em] before:w-px before:bg-border">
              {timeline.slice(0, 8).map((e, i) => (
                <li key={i} className="relative">
                  <span className={cn("absolute -start-5 top-1.5 size-2 rounded-full ring-4 ring-bg", e.tone === "accent" ? "bg-accent" : e.tone === "info" ? "bg-info" : "bg-ink")} />
                  <p className="text-base text-text">{e.text}</p>
                  <p className="text-xs text-text-muted">{fmtDateLong(e.ts)} · {relDate(s.now, e.ts)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}

      {tab === "participants" && (
        <Card padded={false}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div><h2 className="text-md font-semibold text-ink">Participants et évaluateurs suggérés</h2><p className="text-sm text-text-secondary">Le responsable de mission, les collègues et l’équipe sont suggérés.</p></div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={<Sparkles className="size-4" />} onClick={() => setSuggest(true)}>Suggérer automatiquement</Button>
              {canEdit && <Button variant="secondary" size="sm" icon={<UserPlus className="size-4" />} onClick={() => { setAddIds([]); setAdd(true); }}>Ajouter un participant</Button>}
            </div>
          </div>
          <ul className="divide-y divide-border">
            {participants.map((p) => {
              const sug = suggestionsFor(p);
              const sel = picked[p.id] ?? [];
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                  <div className="w-[16em]"><PersonChip user={p} dept={s.departments.find((d) => d.id === p.departmentId)} size="md" /></div>
                  <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                    {sug.map(({ user, why }) => {
                      const on = sel.includes(user.id);
                      return (
                        <li key={user.id}>
                          <button type="button" title={why} onClick={() => setPicked({ ...picked, [p.id]: on ? sel.filter((x) => x !== user.id) : [...sel, user.id] })} aria-pressed={on} className={cn("inline-flex items-center gap-1 rounded-full border py-0.5 ps-1 pe-2 text-xs transition-colors focus-visible:shadow-none focus-visible:ring-2 focus-visible:ring-ink", on ? "border-ink bg-ink text-white" : "border-border-strong text-text-secondary hover:border-ink/50 hover:text-ink")}>
                            <Avatar user={user} dept={s.departments.find((d) => d.id === user.departmentId)} size="xs" />
                            {user.firstName}
                            {on ? <Check className="size-3" /> : <Plus className="size-3" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {p.id === me.id && !readOnly && <Button size="sm" variant="secondary" onClick={() => shell.openRequest({ missionId: m.id, recipientIds: sel.length ? sel : sug.map((x) => x.user.id) })}>Demander un feedback</Button>}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {tab === "feedbacks" && (
        <Card padded={false}>
          <div className="border-b border-border px-5 py-4"><h2 className="text-md font-semibold text-ink">Feedbacks par participant</h2><p className="text-sm text-text-secondary">Seuls les nombres sont affichés ici ; le contenu s’ouvre depuis la page de la personne, selon les règles de visibilité.</p></div>
          <table className="w-full text-base">
            <thead className="bg-canvas text-xs uppercase tracking-[0.06em] text-text-muted"><tr><th className="px-5 py-2.5 text-start">Participant</th><th className="px-5 text-end">Reçus</th><th className="px-5 text-end">Donnés (nominatifs)</th></tr></thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id} className="border-t border-border"><td className="px-5 py-3"><PersonChip user={p} dept={s.departments.find((d) => d.id === p.departmentId)} /></td><td className="px-5 text-end tabular-nums">{s.named.filter((f) => f.missionId === m.id && f.recipientId === p.id).length + s.anonymous.filter((f) => f.missionId === m.id && f.recipientId === p.id).length}</td><td className="px-5 text-end tabular-nums">{s.named.filter((f) => f.missionId === m.id && f.authorId === p.id).length}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "client" && (
        <Card>
          <CardHeader title="Retours clients" description="Un lien web permet au client de répondre sans compte." action={can("clientlink.manage") ? <Button size="sm" icon={<Link2 className="size-4" />} onClick={() => router.push(`/app/feedback-client?nouveau=1&mission=${m.id}`)}>Créer un lien</Button> : undefined} />
          {links.length === 0 ? <EmptyState icon={Link2} title="Aucun lien pour cette mission" className="py-8" /> : (
            <ul className="divide-y divide-border">
              {links.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div><p className="text-base font-medium text-ink">{l.title}</p><p className="text-sm text-text-secondary">{responses.filter((r) => r.linkId === l.id).length} / {l.maxResponses} réponses · expire {relDate(s.now, l.expiresAt)}</p></div>
                  <div className="flex items-center gap-3"><StatusPill status={clientLinkValidity(l, s.clientResponses, s.now) === "OK" ? "ACTIF" : l.status === "DESACTIVE" ? "DESACTIVE" : "EXPIRE"} />{can("clientlink.manage") && <Button size="sm" variant="secondary" onClick={() => router.push(`/app/feedback-client?link=${l.id}`)}>Voir les réponses</Button>}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "parametres" && canEdit && (
        <Card className="max-w-[40em]">
          <CardHeader title="Paramètres de la mission" />
          <div className="flex flex-col gap-5">
            <TextInput label="Nom" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <TextArea label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} rows={3} />
            <SelectInput label="Responsable de mission" value={form.leadId} onChange={(v) => setForm({ ...form, leadId: v })} options={participants.map((u) => ({ value: u.id, label: fullName(u) }))} />
            <div className="flex items-center justify-between border-t border-border pt-5">
              {m.status === "EN_COURS" ? <Button variant="secondary" onClick={() => setFinish(true)}>Marquer comme terminée</Button> : <Badge tone="neutral">Mission terminée</Badge>}
              <Button disabled={!form.name.trim()} onClick={() => { act((d) => updateMission(d, me.id, id, { name: form.name.trim(), description: form.description, leadId: form.leadId })); toast({ title: "Mission enregistrée" }); }}>Enregistrer</Button>
            </div>
          </div>
        </Card>
      )}

      <Modal open={suggest} onClose={() => setSuggest(false)} size="lg" title="Évaluateurs suggérés" subtitle="Aperçu des suggestions pour chaque participant." footer={<><Button variant="ghost" onClick={() => setSuggest(false)}>Fermer</Button><Button onClick={() => { setPicked(Object.fromEntries(participants.map((p) => [p.id, suggestionsFor(p).map((x) => x.user.id)]))); setSuggest(false); toast({ title: "Suggestions appliquées" }); }}>Appliquer</Button></>}>
        <ul className="flex flex-col gap-3">
          {participants.map((p) => (
            <li key={p.id} className="flex items-start gap-3 text-sm"><span className="w-[10em] shrink-0 font-medium text-ink">{fullName(p)}</span><span className="text-text-secondary">{suggestionsFor(p).map((x) => `${x.user.firstName} (${x.why})`).join(", ")}</span></li>
          ))}
        </ul>
      </Modal>
      <Modal open={add} onClose={() => setAdd(false)} size="lg" title="Ajouter des participants" footer={<><Button variant="ghost" onClick={() => setAdd(false)}>Annuler</Button><Button disabled={!addIds.length} onClick={() => { act((d) => setParticipants(d, id, [...new Set([...m.participantIds, ...addIds])])); setAdd(false); toast({ title: `${addIds.length} participant${addIds.length > 1 ? "s" : ""} ajouté${addIds.length > 1 ? "s" : ""}` }); }}>Ajouter</Button></>}>
        <Field label="Personnes"><PeoplePicker users={s.users.filter((u) => u.status === "ACTIF" && u.role !== "ADMIN_TECH")} departments={s.departments} selected={addIds} onChange={setAddIds} disabledIds={m.participantIds} height="15em" /></Field>
      </Modal>
      <Modal open={finish} onClose={() => setFinish(false)} title="Marquer la mission comme terminée ?" footer={<><Button variant="ghost" onClick={() => setFinish(false)}>Annuler</Button><Button onClick={() => { act((d) => completeMission(d, me.id, id)); setFinish(false); toast({ title: "Mission terminée" }); }}>Confirmer</Button></>}>
        <Callout tone="info">Les feedbacks restent possibles jusqu’à la fin du cycle.</Callout>
      </Modal>
    </Guard>
  );
}

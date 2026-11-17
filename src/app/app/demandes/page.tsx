"use client";
import { CheckCircle2, Clock, CornerUpLeft, Inbox, MessageSquareReply, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { act } from "@/lib/store/store";
import { addRecipientsToRequest, declineTask, remindRequest, resendTask, returnTask } from "@/lib/store/actions";
import { daysBetween, directionLabel, fmtDate, fullName, relDate, suggestedRelation } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { pendingTasks, requestProgress, requestsBy, returnedTasksOf, treatedTasks } from "@/lib/store/selectors";
import type { FeedbackRequest } from "@/lib/store/types";
import { Guard } from "@/components/app/Guard";
import { PeoplePicker } from "@/components/app/PeoplePicker";
import { useShell } from "@/components/app/ShellContext";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/FormInputs";
import { Modal } from "@/components/ui/Overlay";
import { Callout, Card, EmptyState, PageHeader, ProgressBar, Stagger, StaggerItem } from "@/components/ui/Surface";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { useQueryState } from "@/lib/use-query-state";

function PersonRow({ id }: { id: string }) {
  const { s } = useSession();
  const u = s.users.find((x) => x.id === id);
  if (!u) return null;
  return (
    <span className="flex items-center gap-2.5">
      <Avatar user={u} dept={s.departments.find((d) => d.id === u.departmentId)} size="md" />
      <span className="leading-tight">
        <span className="block text-base font-medium text-ink">{fullName(u)}</span>
        <span className="block text-xs text-text-muted">{u.jobTitle}</span>
      </span>
    </span>
  );
}

function SentCard({ r }: { r: FeedbackRequest }) {
  const { s, readOnly } = useSession();
  const toast = useToast();
  const [remind, setRemind] = useState(false);
  const [more, setMore] = useState(false);
  const [extra, setExtra] = useState<string[]>([]);
  const [fix, setFix] = useState<{ giverId: string } | null>(null);
  const [fixRole, setFixRole] = useState("");
  const [fixMsg, setFixMsg] = useState("");
  const returned = returnedTasksOf(s, r.id);
  const p = requestProgress(s, r);
  const mission = s.missions.find((m) => m.id === r.missionId);
  const pending = p.pendingNamedUnknown;
  return (
    <Card padded>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-md font-semibold text-ink">{mission?.name ?? "Sans mission"}</p>
          <p className="mt-0.5 text-sm text-text-secondary">Envoyée le {fmtDate(r.createdAt)} · échéance {fmtDate(r.dueDate)} ({relDate(s.now, r.dueDate)})</p>
          {r.role && <p className="mt-1 max-w-[40em] text-sm text-text-secondary text-pretty">Votre rôle : {r.role}{r.hours ? ` · ${r.hours} h passées` : ""}</p>}
        </div>
        <div className="text-end">
          <p className="text-xl font-semibold tabular-nums text-ink">{p.answered}<span className="text-sm font-normal text-text-muted"> sur {p.asked}</span></p>
          <p className="text-xs text-text-muted">réponses reçues sur demandées</p>
        </div>
      </div>
      <ProgressBar value={p.asked ? p.answered / p.asked : 0} className="mt-4" label="Réponses reçues" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">Réponses nominatives</p>
          {p.namedAnswerers.length ? <ul className="flex flex-col gap-2">{p.namedAnswerers.map((id) => <li key={id} className="flex items-center justify-between"><PersonRow id={id} /><Badge tone="success" dot>Répondu</Badge></li>)}</ul> : <p className="text-sm text-text-muted">Aucune pour l’instant.</p>}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">Autres</p>
          <ul className="flex flex-col gap-1.5 text-sm text-text-secondary">
            <li className="flex items-center justify-between"><span>Réponses anonymes</span><span className="font-semibold tabular-nums text-ink">{p.anonymous}</span></li>
            <li className="flex items-center justify-between"><span>Sans réponse pour l’instant</span><span className="font-semibold tabular-nums text-ink">{pending}</span></li>
          </ul>
          <p className="mt-2 text-xs text-text-muted">Les réponses anonymes ne sont jamais rattachées à une personne.</p>
        </div>
      </div>
      {returned.length > 0 && (
        <div className="mt-4 rounded-lg border border-warning/30 bg-warning-bg p-4">
          <p className="text-sm font-semibold text-ink">{returned.length} demande{returned.length > 1 ? "s" : ""} retournée{returned.length > 1 ? "s" : ""} à corriger</p>
          <ul className="mt-3 flex flex-col gap-3">
            {returned.map((t) => (
              <li key={t.id} className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <PersonRow id={t.giverId} />
                  {t.reason && <p className="mt-1.5 text-sm text-text-secondary text-pretty">« {t.reason} »</p>}
                </div>
                <Button size="sm" variant="secondary" disabled={readOnly} onClick={() => { setFix({ giverId: t.giverId }); setFixRole(r.role ?? ""); setFixMsg(r.message); }}>Corriger et renvoyer</Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button size="sm" variant="secondary" disabled={readOnly || pending === 0} onClick={() => setRemind(true)}>Relancer</Button>
        <Button size="sm" variant="secondary" disabled={readOnly} onClick={() => setMore(true)}>Demander à d’autres</Button>
      </div>
      <Modal open={remind} onClose={() => setRemind(false)} title="Relancer les personnes sollicitées" subtitle={`${pending} personne${pending > 1 ? "s" : ""} recevront un rappel.`} footer={<><Button variant="ghost" onClick={() => setRemind(false)}>Annuler</Button><Button onClick={() => { const n = act((d) => remindRequest(d, r.id)); setRemind(false); toast({ title: `${n} rappel${n > 1 ? "s" : ""} envoyé${n > 1 ? "s" : ""}` }); }}>Envoyer le rappel</Button></>}>
        <div className="rounded-lg border border-border bg-canvas p-4 text-sm text-text">
          <p className="font-semibold text-ink">Rappel : un feedback vous attend</p>
          <p className="mt-2">Bonjour, une demande de feedback{mission ? ` sur « ${mission.name} »` : ""} est toujours en attente. Merci d’y répondre avant le {fmtDate(r.dueDate)}.</p>
        </div>
      </Modal>
      <Modal open={!!fix} onClose={() => setFix(null)} title="Corriger et renvoyer la demande" subtitle="La personne sera prévenue que vous avez corrigé votre demande." footer={<><Button variant="ghost" onClick={() => setFix(null)}>Annuler</Button><Button disabled={!!mission && !fixRole.trim()} onClick={() => { act((d) => resendTask(d, r.requesterId, r.id, fix!.giverId, { role: mission ? fixRole : undefined, message: fixMsg })); setFix(null); toast({ title: "Demande renvoyée" }); }}>Renvoyer</Button></>}>
        <div className="flex flex-col gap-4">
          {mission && <TextArea label="Votre rôle sur la mission" required value={fixRole} onChange={setFixRole} rows={3} max={400} />}
          <TextArea label="Message" value={fixMsg} onChange={setFixMsg} rows={3} max={400} />
        </div>
      </Modal>
      <Modal open={more} onClose={() => setMore(false)} title="Demander à d’autres personnes" size="lg" footer={<><Button variant="ghost" onClick={() => setMore(false)}>Annuler</Button><Button disabled={!extra.length} onClick={() => { act((d) => addRecipientsToRequest(d, r.id, extra)); setMore(false); setExtra([]); toast({ title: `${extra.length} demande${extra.length > 1 ? "s" : ""} ajoutée${extra.length > 1 ? "s" : ""}` }); }}>Ajouter {extra.length || ""}</Button></>}>
        <PeoplePicker users={s.users.filter((u) => u.status === "ACTIF" && u.id !== r.requesterId && u.role !== "ADMIN_TECH")} departments={s.departments} selected={extra} onChange={setExtra} disabledIds={r.recipientIds} suggested={mission?.participantIds ?? []} height="14em" />
      </Modal>
    </Card>
  );
}

export default function DemandesPage() {
  const { s, me, readOnly } = useSession();
  const router = useRouter();
  const toast = useToast();
  const q = useQueryState();
  const shell = useShell();
  const tab = (q.get("tab") || "traiter") as "traiter" | "traitees" | "envoyees";
  const [decline, setDecline] = useState<{ requestId: string } | null>(null);
  const [reason, setReason] = useState("");
  const [back, setBack] = useState<{ requestId: string } | null>(null);
  const [backReason, setBackReason] = useState("");
  if (!me) return null;
  const todo = pendingTasks(s, me.id);
  const done = treatedTasks(s, me.id);
  const sent = requestsBy(s, me.id);
  return (
    <Guard action="request.create">
      <PageHeader title="Mes demandes" description="Les demandes de feedback qui vous sont adressées, et celles que vous avez envoyées." actions={<Button variant="secondary" disabled={readOnly} onClick={() => shell.openRequest()}>Demander un feedback</Button>} />
      <Tabs label="Mes demandes" className="mb-6" value={tab} onChange={(v) => q.set("tab", v === "traiter" ? null : v)} items={[{ value: "traiter", label: "À traiter", count: todo.length }, { value: "traitees", label: "Traitées", count: done.length }, { value: "envoyees", label: "Envoyées", count: sent.length }]} />
      {tab === "traiter" &&
        (todo.length === 0 ? (
          <Card><EmptyState icon={Inbox} title="Aucune demande à traiter" description="Quand un collègue vous demandera un feedback, il apparaîtra ici." /></Card>
        ) : (
          <Stagger className="flex flex-col gap-4">
            {todo.map(({ request: r }) => {
              const requester = s.users.find((u) => u.id === r.requesterId);
              const mission = s.missions.find((m) => m.id === r.missionId);
              const soon = daysBetween(s.now, r.dueDate) < 3;
              if (!requester) return null;
              return (
                <StaggerItem key={r.id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <Avatar user={requester} dept={s.departments.find((d) => d.id === requester.departmentId)} size="lg" />
                        <div>
                          <p className="text-md font-semibold text-ink">{fullName(requester)}</p>
                          <p className="text-sm text-text-secondary">{mission?.name ?? "Sans mission"}</p>
                          <p className="mt-1.5"><Badge tone="neutral">{directionLabel[suggestedRelation(requester, me) ?? "PAIR"]}</Badge></p>
                          {r.role && <p className="mt-2 max-w-[40em] text-sm text-text-secondary text-pretty">Son rôle : {r.role}{r.hours ? ` · ${r.hours} h passées` : ""}</p>}
                          {r.message && <p className="mt-3 max-w-[40em] rounded-lg bg-canvas px-3.5 py-2.5 text-base text-text text-pretty">« {r.message} »</p>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", soon ? "text-danger" : "text-text-secondary")}><Clock className="size-4" /> {relDate(s.now, r.dueDate)}</span>
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" icon={<CornerUpLeft className="size-4" />} disabled={readOnly} onClick={() => setBack({ requestId: r.id })}>Retourner</Button>
                          <Button variant="secondary" size="sm" disabled={readOnly} onClick={() => setDecline({ requestId: r.id })}>Décliner</Button>
                          <Button size="sm" icon={<MessageSquareReply className="size-4" />} disabled={readOnly} onClick={() => router.push(`/app/feedback/nouveau?request=${r.id}`)}>Répondre</Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                </StaggerItem>
              );
            })}
          </Stagger>
        ))}
      {tab === "traitees" &&
        (done.length === 0 ? (
          <Card><EmptyState icon={CheckCircle2} title="Rien de traité pour l’instant" /></Card>
        ) : (
          <Card padded={false}>
            <ul className="divide-y divide-border">
              {done.map(({ task, request: r }) => (
                <li key={task.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <PersonRow id={r.requesterId} />
                  <span className="hidden text-sm text-text-secondary sm:block">{s.missions.find((m) => m.id === r.missionId)?.name ?? "Sans mission"}</span>
                  <StatusPill status={task.status} />
                </li>
              ))}
            </ul>
            <p className="border-t border-border px-5 py-3 text-xs text-text-muted">Cette liste ne précise pas si votre réponse était nominative ou anonyme.</p>
          </Card>
        ))}
      {tab === "envoyees" &&
        (sent.length === 0 ? (
          <Card><EmptyState icon={Send} title="Vous n’avez pas encore envoyé de demande" description="Demandez un feedback aux personnes avec lesquelles vous avez travaillé." action={<Button disabled={readOnly} onClick={() => shell.openRequest()}>Demander un feedback</Button>} /></Card>
        ) : (
          <div className="flex flex-col gap-4">
            <Callout tone="neutral">Les réponses anonymes apparaissent uniquement dans un compteur : il n’existe aucun moyen de savoir qui les a écrites.</Callout>
            {sent.map((r) => <SentCard key={r.id} r={r} />)}
          </div>
        ))}
      <Modal open={!!back} onClose={() => setBack(null)} title="Retourner cette demande ?" subtitle="À utiliser si vous n’êtes pas la bonne personne, ou si la demande est mal renseignée. Le demandeur sera prévenu et pourra la corriger." footer={<><Button variant="ghost" onClick={() => setBack(null)}>Annuler</Button><Button disabled={!backReason.trim()} onClick={() => { act((d) => returnTask(d, me.id, back!.requestId, backReason)); setBack(null); setBackReason(""); toast({ title: "Demande retournée" }); }}>Retourner</Button></>}>
        <TextArea label="Motif" required value={backReason} onChange={setBackReason} rows={3} max={300} placeholder="Ex. : nous n’avons pas travaillé ensemble sur cette mission." />
      </Modal>
      <Modal open={!!decline} onClose={() => setDecline(null)} title="Décliner cette demande ?" subtitle="La personne qui vous l’a adressée en sera informée, sans détail." footer={<><Button variant="ghost" onClick={() => setDecline(null)}>Annuler</Button><Button variant="danger" onClick={() => { act((d) => declineTask(d, me.id, decline!.requestId, reason.trim() || undefined)); setDecline(null); setReason(""); toast({ title: "Demande déclinée" }); }}>Décliner</Button></>}>
        <TextArea label="Motif (facultatif)" value={reason} onChange={setReason} rows={3} max={300} />
      </Modal>
    </Guard>
  );
}


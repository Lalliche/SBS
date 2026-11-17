"use client";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, Lock, Pencil, Send, VenetianMask, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import logo from "@/assets/sbs-logo.png";
import { cn } from "@/lib/utils";
import { dur, ease, spring } from "@/lib/motion-tokens";
import { act } from "@/lib/store/store";
import { clearDraft, completeTaskAnonymously, emptyDraft, giveAnonymous, giveNamed, openCycle, saveDraft } from "@/lib/store/actions";
import { fmtDate, fullName, gradeBand, questionText, relationLabel, suggestedRelation } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import type { Draft, Relation } from "@/lib/store/types";
import { Avatar, AnonymousBadge } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Surface";
import { Checkbox, SelectInput, TextArea } from "@/components/ui/FormInputs";
import { Modal } from "@/components/ui/Overlay";
import { PeoplePicker } from "@/components/app/PeoplePicker";
import { useToast } from "@/components/ui/Toast";

const STEPS = ["Pour qui ?", "Nominatif ou anonyme ?", "Vos réponses", "Note et envoi"];

export function Wizard() {
  const { s, me, open: cycle } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const reduce = useReducedMotion();
  const requestId = params.get("request");
  const request = requestId ? s.requests.find((r) => r.id === requestId) : undefined;

  const initial = useMemo<Draft>(() => {
    const stored = me ? s.drafts[me.id] : undefined;
    const base = stored && !request ? stored : emptyDraft();
    const to = params.get("to");
    return {
      ...base,
      recipientId: request ? request.requesterId : to ?? base.recipientId,
      missionId: request ? request.missionId : params.get("mission") ?? base.missionId,
      requestId: request?.id ?? null,
      step: request || to ? Math.max(base.step, 0) : base.step,
    };
    // initial value only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [draft, setDraft] = useState<Draft>(initial);
  const [dir, setDir] = useState(1);
  const [stepErr, setStepErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [layout, setLayout] = useState<"one" | "all">("one");
  const [qi, setQi] = useState(0);
  const [ack, setAck] = useState(false);
  const [quit, setQuit] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const dirty = useRef(false);

  const patch = useCallback((p: Partial<Draft>) => {
    dirty.current = true;
    setDraft((d) => ({ ...d, ...p }));
  }, []);

  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  // Autosave every 5 s (only while editing)
  useEffect(() => {
    if (!me || done) return;
    const t = setInterval(() => {
      if (!dirty.current) return;
      dirty.current = false;
      act((d) => saveDraft(d, me.id, { ...draftRef.current, cycleId: cycle.id }));
      const n = new Date();
      setSaved(`${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`);
    }, 5000);
    return () => clearInterval(t);
  }, [me, done, cycle.id]);

  const recipient = s.users.find((u) => u.id === draft.recipientId) ?? null;
  // Proposed from the reporting line, else from the grades; the giver can correct it (post-contract, PwC reference).
  const proposed: Relation = me && recipient ? suggestedRelation(me, recipient) ?? "PAIR" : "PAIR";
  const [relOverride, setRelOverride] = useState<Relation | "">("");
  const effRelation: Relation = relOverride || proposed;
  const band = recipient ? gradeBand(recipient.grade) : "CONFIRME";
  const mission = s.missions.find((m) => m.id === draft.missionId) ?? null;
  const questions = s.questions.filter((q) => q.kind === "COLLAB" && q.active && (!q.appliesTo || q.appliesTo.includes(effRelation))).sort((a, b) => a.order - b.order);
  const answered = questions.filter((q) => draft.answers[q.id]?.trim()).length;
  const anonAllowed = request ? request.allowAnonymous : s.settings.visibility.allowAnonymousOnRequest || !request;
  const staleDraft = !!draft.cycleId && draft.cycleId !== cycle.id && !!me && !!s.drafts[me.id];

  const shared = me && recipient ? s.missions.filter((m) => m.cycleId === cycle.id && m.participantIds.includes(me.id) && m.participantIds.includes(recipient.id)) : [];
  const noteByComp = s.settings.noteMode === "PAR_COMPETENCE";

  const go = (n: number) => {
    setDir(n > draft.step ? 1 : -1);
    setStepErr(null);
    patch({ step: n });
  };
  const next = () => {
    if (draft.step === 0) {
      if (!recipient) return setStepErr("Choisissez la personne à qui s’adresse votre feedback.");
      if (me && recipient.id === me.id) return setStepErr("Vous ne pouvez pas vous donner de feedback.");
      if (!mission && !s.settings.visibility.feedbackWithoutMission) return setStepErr("Choisissez une mission.");
    }
    if (draft.step === 1) {
      if (!draft.type) return setStepErr("Choisissez comment envoyer votre feedback.");
      if (draft.type === "ANONYME" && !ack) return setStepErr("Confirmez que vous avez compris que l’envoi anonyme est définitif.");
    }
    if (draft.step === 2 && answered === 0) return setStepErr("Répondez à au moins une question pour continuer.");
    go(Math.min(3, draft.step + 1));
  };

  // ←/→ between questions (when not typing)
  useEffect(() => {
    if (draft.step !== 2 || layout !== "one") return;
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "TEXTAREA" || t.tagName === "INPUT";
      if (typing && !(e.ctrlKey || e.metaKey)) return;
      if (e.key === "ArrowRight") setQi((i) => Math.min(questions.length - 1, i + 1));
      if (e.key === "ArrowLeft") setQi((i) => Math.max(0, i - 1));
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [draft.step, layout, questions.length]);

  if (!me) return null;

  const send = () => {
    if (!recipient || !draft.type) return;
    setSending(true);
    setTimeout(() => {
      const ratings = Object.fromEntries(Object.entries(draft.ratings).filter(([, v]) => v >= 1 && v <= 5));
      const askedIds = new Set(questions.map((q) => q.id));
      const answers = Object.fromEntries(Object.entries(draft.answers).filter(([k, v]) => askedIds.has(k) && v.trim()));
      if (draft.type === "NOMINATIF") {
        act((d) => giveNamed(d, { authorId: me.id, recipientId: recipient.id, missionId: draft.missionId, relation: effRelation, requestId: draft.requestId ?? undefined, answers, ratings }));
      } else {
        // The anonymous path receives NO author id (spec 7.2.1). The giver's task is closed by a separate call.
        act((d) => giveAnonymous(d, { recipientId: recipient.id, missionId: draft.missionId, relation: effRelation, answers, ratings }));
        if (draft.requestId) act((d) => completeTaskAnonymously(d, me.id, draft.requestId!));
      }
      act((d) => clearDraft(d, me.id));
      dirty.current = false;
      setSending(false);
      setConfirm(false);
      setDone(true);
    }, 650);
  };

  const exit = () => router.push("/app/accueil");
  const slide = { enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 28 }), center: { opacity: 1, x: 0, transition: { duration: dur.slow, ease: ease.out } }, exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -20, transition: { duration: dur.fast, ease: ease.in } }) };

  if (done)
    return (
      <div className="mx-auto flex min-h-full max-w-[34em] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <motion.svg viewBox="0 0 64 64" className="size-20" initial="h" animate="v">
          <motion.circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-success)" strokeWidth="3" variants={{ h: { pathLength: 0 }, v: { pathLength: 1, transition: { duration: 0.7, ease: ease.inOut } } }} />
          <motion.path d="M20 33 L29 42 L45 24" fill="none" stroke="var(--color-success)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" variants={{ h: { pathLength: 0 }, v: { pathLength: 1, transition: { duration: 0.5, delay: 0.55, ease: ease.out } } }} />
        </motion.svg>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink">Merci, votre feedback a été envoyé.</h1>
          <p className="mt-2 text-base text-text-secondary text-pretty">
            {draft.type === "ANONYME" ? "Il a été enregistré sans aucun lien avec votre identité." : `${recipient?.firstName} le retrouvera dans « Mes feedbacks ».`} Les compteurs et notifications sont à jour.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="secondary" onClick={() => { setDraft(emptyDraft()); setAck(false); setDone(false); setQi(0); router.replace("/app/feedback/nouveau"); }}>Donner un autre feedback</Button>
          <Button onClick={exit}>Retour à l’accueil</Button>
        </div>
        {draft.type === "NOMINATIF" && (
          <Link href="/app/feedbacks?tab=envoyes" className="text-sm font-medium text-ink underline underline-offset-4 hover:text-accent">Voir mes feedbacks envoyés</Link>
        )}
      </div>
    );

  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-bg px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Image src={logo} alt="SBS" className="h-8 w-auto" sizes="100px" />
          <span className="hidden h-5 w-px bg-border sm:block" />
          <p className="hidden text-base font-medium text-ink sm:block">Donner un feedback</p>
        </div>
        <div className="flex items-center gap-4">
          {saved && <span className="hidden text-xs text-text-muted sm:block">Brouillon enregistré à {saved}</span>}
          <Button variant="ghost" size="sm" icon={<X className="size-4" />} onClick={() => (dirty.current || answered > 0 ? setQuit(true) : exit())}>
            Quitter
          </Button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[78em] flex-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[13em_1fr_19em]">
        <nav aria-label="Étapes" className="max-lg:hidden">
          <ol className="sticky top-8 flex flex-col gap-1">
            {STEPS.map((t, i) => {
              const state = i === draft.step ? "cur" : i < draft.step ? "done" : "todo";
              return (
                <li key={t}>
                  <button type="button" disabled={i > draft.step} onClick={() => go(i)} aria-current={state === "cur" ? "step" : undefined} className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-start text-base transition-colors duration-150 focus-visible:shadow-none focus-visible:ring-2 focus-visible:ring-ink", state === "cur" ? "bg-bg font-semibold text-ink shadow-xs" : state === "done" ? "text-text hover:bg-bg" : "text-text-muted")}>
                    <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold", state === "done" ? "border-ink bg-ink text-white" : state === "cur" ? "border-accent text-accent" : "border-border-strong")}>{state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}</span>
                    {t}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <section className="min-w-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-text-muted lg:hidden">Étape {draft.step + 1} / 4 · {STEPS[draft.step]}</p>
          {staleDraft && (
            <Callout tone="warning" className="mb-4" title="Cycle archivé : le brouillon ne peut plus être envoyé" action={<Button size="sm" variant="secondary" icon={<Copy className="size-4" />} onClick={() => { navigator.clipboard?.writeText(Object.values(draft.answers).join("\n\n")); toast({ title: "Texte copié" }); }}>Copier le texte</Button>}>
              Votre brouillon appartient à un cycle terminé. Copiez votre texte pour le réutiliser dans un nouveau feedback.
            </Callout>
          )}
          <div className="rounded-xl border border-border bg-bg p-6 sm:p-8">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div key={`${draft.step}-${draft.step === 2 && layout === "one" ? qi : 0}`} custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
                {draft.step === 0 && (
                  <div className="flex flex-col gap-6">
                    <div>
                      <h1 className="text-lg font-semibold text-ink">Pour qui est ce feedback ?</h1>
                      <p className="mt-1 text-sm text-text-secondary">Il porte sur la contribution de la personne à une mission, pas sur la mission elle-même.</p>
                    </div>
                    {request ? (
                      <Callout tone="info" title={`Réponse à la demande de ${recipient ? fullName(recipient) : "…"}`}>{mission ? `Mission : ${mission.name}. ` : "Sans mission. "}Échéance : {fmtDate(request.dueDate)}.{request.role && <span className="mt-1 block">Rôle du demandeur : {request.role}{request.hours ? ` (${request.hours} h passées)` : ""}</span>}</Callout>
                    ) : (
                      <PeoplePicker multi={false} users={s.users.filter((u) => u.status === "ACTIF" && u.id !== me.id && u.role !== "ADMIN_TECH")} departments={s.departments} selected={draft.recipientId ? [draft.recipientId] : []} onChange={(ids) => { setRelOverride(""); patch({ recipientId: ids[0], missionId: null }); }} relationFor={(u) => suggestedRelation(me, u)} />
                    )}
                    {recipient && (
                      <div className="flex flex-col gap-4">
                        <SelectInput<Relation | "AUTO"> label="Nature de ce feedback" value={relOverride || "AUTO"} onChange={(v) => setRelOverride(v === "AUTO" ? "" : v)} options={[{ value: "AUTO", label: `Garder la nature proposée (${{ RESPONSABLE: "personne plus junior que moi", PAIR: "pair", EQUIPE: "personne plus senior que moi" }[proposed]})` }, { value: "PAIR", label: "Cette personne est un pair" }, { value: "RESPONSABLE", label: "Cette personne est plus junior que moi" }, { value: "EQUIPE", label: "Cette personne est plus senior que moi" }]} hint="Proposée d’après la hiérarchie et les grades. Corrigez-la si votre relation de travail est différente." />
                        {!request && (
                          <SelectInput label="Mission" value={draft.missionId ?? ""} onChange={(v) => patch({ missionId: v || null })} placeholder="Choisir une mission" options={[...shared.map((m) => ({ value: m.id, label: m.name })), ...(s.settings.visibility.feedbackWithoutMission ? [{ value: "", label: "Aucune mission" }] : [])]} hint={shared.length ? `${shared.length} mission${shared.length > 1 ? "s" : ""} en commun suggérée${shared.length > 1 ? "s" : ""}.` : "Aucune mission en commun."} />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {draft.step === 1 && (
                  <div className="flex flex-col gap-6">
                    <div>
                      <h1 className="text-lg font-semibold text-ink">Nominatif ou anonyme ?</h1>
                      <p className="mt-1 text-sm text-text-secondary">Vous choisissez avant d’écrire. Ce choix vaut pour ce feedback uniquement.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Type de feedback">
                      {([
                        { v: "NOMINATIF", icon: <Pencil className="size-5" />, title: "Nominatif", text: "Votre nom sera visible par la personne et son responsable.", off: false },
                        { v: "ANONYME", icon: <VenetianMask className="size-5" />, title: "Anonyme", text: "Votre identité n’est enregistrée nulle part. Personne ne pourra la retrouver, pas même les administrateurs.", off: !anonAllowed },
                      ] as const).map((o) => {
                        const on = draft.type === o.v;
                        return (
                          <button key={o.v} type="button" role="radio" aria-checked={on} disabled={o.off} onClick={() => patch({ type: o.v })} className={cn("relative flex flex-col gap-3 rounded-xl border-2 p-5 text-start transition-[border-color,background-color] duration-150 focus-visible:shadow-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-45", on ? "border-ink bg-canvas" : "border-border hover:border-ink/40")}>
                            <span className={cn("flex size-10 items-center justify-center rounded-full", on ? "bg-ink text-white" : "bg-paper text-ink")}>{o.icon}</span>
                            <span className="text-md font-semibold text-ink">{o.title}</span>
                            <span className="text-sm text-text-secondary text-pretty">{o.off ? "Le demandeur n’autorise pas les réponses anonymes pour cette demande." : o.text}</span>
                            {on && <motion.span layoutId="type-check" transition={spring.ui} className="absolute end-4 top-4 flex size-6 items-center justify-center rounded-full bg-ink text-white"><Check className="size-3.5" strokeWidth={3} /></motion.span>}
                          </button>
                        );
                      })}
                    </div>
                    {draft.type && (
                      <div className="rounded-lg border border-border bg-canvas p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Ce que verra le destinataire</p>
                        <div className="flex items-center gap-3 rounded-lg border border-border bg-bg p-3.5">
                          {draft.type === "NOMINATIF" ? (
                            <><Avatar user={me} dept={s.departments.find((d) => d.id === me.departmentId)} size="sm" /><span className="text-base font-medium text-ink">{fullName(me)}</span></>
                          ) : (
                            <AnonymousBadge />
                          )}
                          {(draft.type === "NOMINATIF" || s.settings.visibility.showRelationOnAnonymous) && <Badge tone="neutral">{relationLabel[effRelation]}</Badge>}
                          <span className="ms-auto text-xs text-text-muted">{mission?.name ?? "Sans mission"}</span>
                        </div>
                      </div>
                    )}
                    {draft.type === "ANONYME" && (
                      <div className="rounded-lg border border-danger/20 bg-danger-bg p-4">
                        <Checkbox checked={ack} onChange={setAck} label={<span className="text-danger">J’ai compris que je ne pourrai plus modifier ni retirer ce feedback.</span>} />
                      </div>
                    )}
                  </div>
                )}

                {draft.step === 2 && recipient && (
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h1 className="text-lg font-semibold text-ink">Vos réponses</h1>
                        <p className="mt-1 text-sm text-text-secondary">Décrivez une situation observée, en une phrase ou un paragraphe.</p>
                      </div>
                      <div role="radiogroup" aria-label="Affichage" className="inline-flex rounded-md bg-paper p-0.5 text-xs font-medium">
                        {([["one", "Une par écran"], ["all", "Toutes"]] as const).map(([v, l]) => (
                          <button key={v} role="radio" aria-checked={layout === v} type="button" onClick={() => setLayout(v)} className={cn("rounded px-2.5 py-1 transition-colors", layout === v ? "bg-bg text-ink shadow-xs" : "text-text-secondary")}>{l}</button>
                        ))}
                      </div>
                    </div>
                    {(layout === "all" ? questions : [questions[qi]]).map((q) => (
                      <div key={q.id} className="flex flex-col gap-2">
                        <Badge tone="neutral" className="self-start">{s.competencies.find((c) => c.id === q.competencyId)?.name ?? q.topic ?? "Commentaire libre"}</Badge>
                        <p className="text-md font-medium leading-snug text-ink text-pretty">{questionText(q, effRelation, band)}</p>
                        <TextArea label="" value={draft.answers[q.id] ?? ""} onChange={(v) => patch({ answers: { ...draft.answers, [q.id]: v } })} rows={layout === "all" ? 3 : 6} max={1200} placeholder="Décrivez une situation observée…" />
                      </div>
                    ))}
                    {layout === "one" && (
                      <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" icon={<ArrowLeft className="size-4" />} disabled={qi === 0} onClick={() => setQi(qi - 1)}>Question précédente</Button>
                        <div className="flex gap-1.5" aria-label={`Question ${qi + 1} sur ${questions.length}`}>
                          {questions.map((q, i) => (
                            <button key={q.id} type="button" aria-label={`Question ${i + 1}`} onClick={() => setQi(i)} className={cn("size-2.5 rounded-full transition-colors", i === qi ? "bg-accent" : draft.answers[q.id]?.trim() ? "bg-ink" : "bg-border-strong")} />
                          ))}
                        </div>
                        <Button variant="ghost" size="sm" iconRight={<ArrowRight className="size-4" />} disabled={qi === questions.length - 1} onClick={() => setQi(qi + 1)}>Suivante</Button>
                      </div>
                    )}
                    <p className="text-xs text-text-muted">← / → pour changer de question (Ctrl + flèches dans le texte).</p>
                  </div>
                )}

                {draft.step === 3 && recipient && (
                  <div className="flex flex-col gap-6">
                    <div>
                      <h1 className="text-lg font-semibold text-ink">Note facultative et envoi</h1>
                      <p className="mt-1 text-sm text-text-secondary">La note de 1 à 5 est un résumé complémentaire. Vous pouvez la passer.</p>
                    </div>
                    <div className="flex flex-col gap-3">
                      {(noteByComp ? s.competencies : [{ id: "mission", name: `Contribution globale à « ${mission?.name ?? "la mission"} »`, description: "", order: 0 }]).map((c) => (
                        <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
                          <span className="text-base font-medium text-ink">{c.name}</span>
                          <div role="radiogroup" aria-label={`Note pour ${c.name}`} className="flex gap-1.5">
                            {[1, 2, 3, 4, 5].map((n) => {
                              const on = draft.ratings[c.id] === n;
                              return (
                                <button key={n} type="button" role="radio" aria-checked={on} onClick={() => patch({ ratings: { ...draft.ratings, [c.id]: on ? 0 : n } })} className={cn("size-9 rounded-md border text-base font-semibold tabular-nums transition-[background-color,border-color,color,transform] duration-150 active:scale-95 focus-visible:shadow-none focus-visible:ring-2 focus-visible:ring-ink", on ? "border-ink bg-ink text-white" : "border-border-strong text-text-secondary hover:border-ink/50 hover:text-ink")}>
                                  {n}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" className="self-start" onClick={() => patch({ ratings: {} })}>Passer — je ne note pas</Button>
                    </div>
                    <div>
                      <h2 className="mb-2 text-md font-semibold text-ink">Relecture</h2>
                      <ul className="divide-y divide-border rounded-lg border border-border">
                        {questions.map((q) => (
                          <li key={q.id} className="flex items-start gap-4 px-4 py-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">{s.competencies.find((c) => c.id === q.competencyId)?.name ?? q.topic ?? "Commentaire libre"}</p>
                              <p className={cn("mt-0.5 text-sm text-text-secondary text-pretty", !draft.answers[q.id]?.trim() && "italic text-text-muted")}>{draft.answers[q.id]?.trim() || "Pas de réponse"}</p>
                            </div>
                            <button type="button" onClick={() => { setQi(questions.indexOf(q)); go(2); }} className="shrink-0 text-sm font-medium text-ink underline underline-offset-2 hover:text-accent">Modifier</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
            {stepErr && <p role="alert" className="mt-5 flex items-center gap-2 text-sm font-medium text-danger"><X className="size-4" /> {stepErr}</p>}
            <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
              <Button variant="ghost" icon={<ArrowLeft className="size-4" />} disabled={draft.step === 0} onClick={() => go(draft.step - 1)}>Retour</Button>
              {draft.step < 3 ? (
                <Button iconRight={<ArrowRight className="size-4" />} onClick={next}>Continuer</Button>
              ) : (
                <Button icon={<Send className="size-4" />} disabled={staleDraft} onClick={() => (answered ? setConfirm(true) : setStepErr("Répondez à au moins une question avant d’envoyer."))}>Envoyer le feedback</Button>
              )}
            </div>
          </div>
        </section>

        <aside aria-label="Récapitulatif" className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-xl border border-border bg-bg p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-text-muted">Récapitulatif</p>
            <dl className="mt-4 flex flex-col gap-4 text-sm">
              <div>
                <dt className="text-xs text-text-muted">Pour</dt>
                <dd className="mt-1.5">
                  {recipient ? (
                    <span className="flex items-center gap-2.5"><Avatar user={recipient} dept={s.departments.find((d) => d.id === recipient.departmentId)} size="sm" /><span><span className="block font-medium text-ink">{fullName(recipient)}</span><span className="block text-xs text-text-muted">{recipient.jobTitle}</span></span></span>
                  ) : <span className="text-text-muted">Non choisi</span>}
                </dd>
              </div>
              <div><dt className="text-xs text-text-muted">Mission</dt><dd className="mt-0.5 font-medium text-ink">{mission?.name ?? "Aucune"}</dd></div>
              <div><dt className="text-xs text-text-muted">Type</dt><dd className="mt-0.5 font-medium text-ink">{draft.type === "ANONYME" ? "Anonyme" : draft.type === "NOMINATIF" ? "Nominatif" : "—"}{recipient && ` · ${relationLabel[effRelation]}`}</dd></div>
              <div>
                <dt className="text-xs text-text-muted">Avancement</dt>
                <dd className="mt-1.5">
                  <div className="h-1.5 overflow-hidden rounded-full bg-paper-deep"><motion.div className="h-full origin-left bg-ink" animate={{ scaleX: answered / Math.max(1, questions.length) }} transition={spring.gentle} style={{ width: "100%" }} /></div>
                  <span className="mt-1 block text-xs text-text-muted tabular-nums">{answered} / {questions.length} réponses</span>
                </dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Envoyer ce feedback ?" subtitle={recipient ? `Pour ${fullName(recipient)}` : undefined} footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>Revenir</Button><Button loading={sending} icon={<Send className="size-4" />} onClick={send}>Envoyer</Button></>}>
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-text-muted">Mission</dt><dd className="font-medium text-ink">{mission?.name ?? "Aucune"}</dd>
          <dt className="text-text-muted">Type</dt><dd className="font-medium text-ink">{draft.type === "ANONYME" ? "Anonyme" : "Nominatif"}</dd>
          <dt className="text-text-muted">Réponses</dt><dd className="font-medium text-ink tabular-nums">{answered}</dd>
          <dt className="text-text-muted">Notes données</dt><dd className="font-medium text-ink tabular-nums">{Object.values(draft.ratings).filter((v) => v > 0).length}</dd>
        </dl>
        {draft.type === "ANONYME" && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-danger/20 bg-danger-bg p-3.5 text-sm text-danger">
            <Lock className="mt-0.5 size-4 shrink-0" />
            <p><span className="font-semibold">Envoi anonyme définitif.</span> Votre identité n’est enregistrée nulle part : ce feedback ne pourra plus être modifié ni retiré, et il n’apparaîtra pas dans vos feedbacks envoyés.</p>
          </div>
        )}
      </Modal>
      <Modal open={quit} onClose={() => setQuit(false)} title="Quitter sans envoyer ?" footer={<><Button variant="ghost" onClick={() => setQuit(false)}>Continuer</Button><Button variant="secondary" onClick={() => { act((d) => saveDraft(d, me.id, { ...draft, cycleId: cycle.id })); exit(); }}>Enregistrer le brouillon et quitter</Button></>}>
        Votre brouillon est enregistré automatiquement. Vous pourrez le reprendre depuis « Donner un feedback ».
      </Modal>
    </div>
  );
}

export const _ = { CheckCircle2, openCycle };

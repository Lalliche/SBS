"use client";
import { CheckCircle2, Clock, Lock, Star, UsersRound } from "lucide-react";
import Image from "next/image";
import { use, useState } from "react";
import logo from "@/assets/sbs-logo.png";
import { cn } from "@/lib/utils";
import { act, useApp, useHydrated } from "@/lib/store/store";
import { submitClientResponse } from "@/lib/store/actions";
import { clientLinkValidity } from "@/lib/store/engine";
import { CLIENT_QUESTIONS } from "@/lib/store/texts";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/FormInputs";
import { Skeleton } from "@/components/ui/Surface";

/* Public client page — outside the app shell, mobile-first. One link = one client: no account, no identification form. */
export default function ClientPage({ params }: PageProps<"/c/[token]">) {
  const { token } = use(params);
  const hydrated = useHydrated();
  const s = useApp();
  const link = s.clientLinks.find((l) => l.token === token);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [rating, setRating] = useState(0);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const shell = (children: React.ReactNode) => (
    <div className="min-h-svh bg-paper">
      <div className="mx-auto flex min-h-svh max-w-[30em] flex-col bg-bg px-5 pb-10 pt-6 shadow-sm">
        <Image src={logo} alt="SBS — Sovereign Business & Strategy" className="mb-6 h-9 w-auto self-start" sizes="120px" />
        {children}
      </div>
    </div>
  );
  const notice = (Icon: typeof Lock, title: string, text: string) =>
    shell(<div className="flex flex-1 flex-col items-center justify-center gap-4 text-center"><span className="flex size-14 items-center justify-center rounded-full bg-paper"><Icon className="size-6" /></span><h1 className="text-lg font-semibold text-ink">{title}</h1><p className="max-w-[22em] text-base text-text-secondary text-pretty">{text}</p></div>);

  if (!hydrated) return shell(<div className="flex flex-col gap-3"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>);
  if (!link) return notice(Lock, "Lien introuvable", "Vérifiez l’adresse du lien ou contactez votre interlocuteur chez SBS.");
  if (sent)
    return shell(<div className="flex flex-1 flex-col items-center justify-center gap-4 text-center"><span className="flex size-14 items-center justify-center rounded-full bg-success-bg text-success"><CheckCircle2 className="size-7" /></span><h1 className="font-display text-xl font-semibold text-ink">Merci pour votre retour, {link.clientName.split(" ")[0]}.</h1><p className="max-w-[22em] text-base text-text-secondary">Vos réponses ont bien été transmises à l’équipe SBS.</p></div>);
  const v = s.clientDevices.includes(link.id) ? "DEJA" : clientLinkValidity(link, s.clientResponses, s.now);
  if (v === "DEJA" || v === "MAX_ATTEINT") return notice(CheckCircle2, "Réponse déjà reçue pour ce lien", "Nous avons bien reçu votre retour. Merci. Ce lien ne peut recevoir qu’une seule réponse.");
  if (v === "EXPIRE") return notice(Clock, "Ce lien a expiré", "Le délai pour répondre est dépassé. Merci de contacter votre interlocuteur chez SBS.");
  if (v === "DESACTIVE") return notice(UsersRound, "Ce lien n’est plus actif", "Il a été désactivé. Merci de contacter votre interlocuteur chez SBS.");

  const qs = link.questionIds.map((id) => ({ id, text: CLIENT_QUESTIONS.find((q) => q.id === id)?.text ?? id }));
  const submit = () => {
    if (!Object.values(answers).some((x) => x.trim()) && !rating) return setErr("Répondez à au moins une question.");
    const ok = act((d) => submitClientResponse(d, token, { answers: { ...answers, "qc-1": rating ? String(rating) : answers["qc-1"] ?? "" }, rating: rating || undefined }));
    if (ok) setSent(true);
    else setErr("Ce lien ne peut plus recevoir de réponse.");
  };
  return shell(
    <>
      <p className="text-sm text-text-secondary">Bonjour {link.clientName.split(" ")[0]},</p>
      <h1 className="mt-1 font-display text-xl font-semibold leading-tight tracking-[-0.01em] text-ink text-balance">{link.title}</h1>
      <p className="mt-2 text-base text-text-secondary text-pretty">{link.welcome}</p>
      <div className="mt-6 flex flex-col gap-6">
        {qs.map((q, i) => (
          <div key={q.id}>
            <p className="text-base font-medium text-ink">{q.text}</p>
            {i === 0 ? (
              <div role="radiogroup" aria-label="Note de 1 à 5" className="mt-2 flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} sur 5`} onClick={() => setRating(rating === n ? 0 : n)} className="rounded p-1 transition-transform active:scale-90 focus-visible:shadow-none focus-visible:ring-2 focus-visible:ring-ink">
                    <Star className={cn("size-8 transition-colors", n <= rating ? "fill-accent text-accent" : "text-border-strong")} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-2"><TextArea label="" value={answers[q.id] ?? ""} onChange={(x) => setAnswers({ ...answers, [q.id]: x })} rows={3} placeholder="Votre réponse (facultatif)" /></div>
            )}
          </div>
        ))}
      </div>
      {err && <p role="alert" className="mt-4 text-sm font-medium text-danger">{err}</p>}
      <Button size="lg" className="mt-8 w-full" onClick={submit}>Envoyer mes réponses</Button>
      <p className="mt-4 text-center text-xs text-text-muted">Aucun compte requis. Ce lien est personnel et ne peut recevoir qu’une réponse.</p>
    </>,
  );
}

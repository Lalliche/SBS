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
import { TextArea, TextInput } from "@/components/ui/FormInputs";
import { Skeleton } from "@/components/ui/Surface";

/* Public client page — outside the app shell, mobile-first. No account, no navigation to the app. */
export default function ClientPage({ params }: PageProps<"/c/[token]">) {
  const { token } = use(params);
  const hydrated = useHydrated();
  const s = useApp();
  const link = s.clientLinks.find((l) => l.token === token);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const shell = (children: React.ReactNode) => (
    <div className="min-h-svh bg-paper">
      <div className="mx-auto flex min-h-svh max-w-[30em] flex-col bg-bg px-5 pb-10 pt-6 shadow-sm sm:my-0">
        <Image src={logo} alt="SBS — Sovereign Business & Strategy" className="mb-6 h-9 w-auto self-start" sizes="120px" />
        {children}
      </div>
    </div>
  );
  if (!hydrated) return shell(<div className="flex flex-col gap-3"><Skeleton className="h-8 w-3/4" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>);
  const state = !link ? "INCONNU" : sent ? "OK" : s.clientDevices.includes(link.id) ? "DEJA" : clientLinkValidity(link, s.clientResponses, s.now);
  const msg = {
    EXPIRE: { icon: Clock, title: "Ce lien a expiré", text: "Le délai pour répondre est dépassé. Merci de contacter votre interlocuteur chez SBS." },
    DESACTIVE: { icon: Lock, title: "Ce lien n’est plus actif", text: "Il a été désactivé. Merci de contacter votre interlocuteur chez SBS." },
    MAX_ATTEINT: { icon: UsersRound, title: "Nombre maximal de réponses atteint", text: "Ce lien a déjà reçu toutes les réponses attendues. Merci pour votre intérêt." },
    DEJA: { icon: CheckCircle2, title: "Réponse déjà envoyée", text: "Nous avons bien reçu votre retour depuis cet appareil. Merci." },
    INCONNU: { icon: Lock, title: "Lien introuvable", text: "Vérifiez l’adresse du lien ou contactez votre interlocuteur chez SBS." },
  } as const;
  if (state !== "OK" && link && state !== undefined && state in msg) {
    const M = msg[state as keyof typeof msg];
    return shell(<div className="flex flex-1 flex-col items-center justify-center gap-4 text-center"><span className="flex size-14 items-center justify-center rounded-full bg-paper"><M.icon className="size-6" /></span><h1 className="text-lg font-semibold text-ink">{M.title}</h1><p className="max-w-[22em] text-base text-text-secondary text-pretty">{M.text}</p></div>);
  }
  if (!link) {
    const M = msg.INCONNU;
    return shell(<div className="flex flex-1 flex-col items-center justify-center gap-4 text-center"><span className="flex size-14 items-center justify-center rounded-full bg-paper"><M.icon className="size-6" /></span><h1 className="text-lg font-semibold text-ink">{M.title}</h1><p className="text-base text-text-secondary">{M.text}</p></div>);
  }
  if (sent)
    return shell(<div className="flex flex-1 flex-col items-center justify-center gap-4 text-center"><span className="flex size-14 items-center justify-center rounded-full bg-success-bg text-success"><CheckCircle2 className="size-7" /></span><h1 className="font-display text-xl font-semibold text-ink">Merci pour votre retour.</h1><p className="max-w-[22em] text-base text-text-secondary">Vos réponses ont bien été transmises à l’équipe SBS.</p></div>);

  const qs = link.questionIds.map((id) => ({ id, text: CLIENT_QUESTIONS.find((q) => q.id === id)?.text ?? id })).filter((q) => q.text);
  const submit = () => {
    if (link.identification === "OBLIGATOIRE" && !name.trim()) return setErr("Merci d’indiquer votre nom.");
    if (!Object.values(answers).some((v) => v.trim()) && !rating) return setErr("Répondez à au moins une question.");
    act((d) => submitClientResponse(d, token, { clientName: name.trim(), company: company.trim(), answers: { ...answers, "qc-1": rating ? String(rating) : answers["qc-1"] ?? "" }, rating: rating || undefined }));
    setSent(true);
  };
  return shell(
    <>
      <h1 className="font-display text-xl font-semibold leading-tight tracking-[-0.01em] text-ink text-balance">{link.title}</h1>
      <p className="mt-2 text-base text-text-secondary text-pretty">{link.welcome}</p>
      {link.identification !== "AUCUNE" && (
        <fieldset className="mt-6 flex flex-col gap-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-sm font-medium text-ink">Vous {link.identification === "FACULTATIVE" ? "(facultatif)" : ""}</legend>
          <TextInput label="Nom" required={link.identification === "OBLIGATOIRE"} value={name} onChange={setName} />
          <TextInput label="Organisation" value={company} onChange={setCompany} />
        </fieldset>
      )}
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
              <div className="mt-2"><TextArea label="" value={answers[q.id] ?? ""} onChange={(v) => setAnswers({ ...answers, [q.id]: v })} rows={3} placeholder="Votre réponse (facultatif)" /></div>
            )}
          </div>
        ))}
      </div>
      {err && <p role="alert" className="mt-4 text-sm font-medium text-danger">{err}</p>}
      <Button size="lg" className="mt-8 w-full" onClick={submit}>Envoyer mes réponses</Button>
      <p className="mt-4 text-center text-xs text-text-muted">Aucun compte requis. Vos réponses sont transmises à SBS.</p>
    </>,
  );
}

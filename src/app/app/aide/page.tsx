"use client";
import { ChevronDown, Compass, Route } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { faq } from "@/content/landing";
import { roleLabel } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Surface";
import { useShell } from "@/components/app/ShellContext";

const QUICK: Record<string, Array<{ t: string; d: string }>> = {
  COLLABORATEUR: [{ t: "Donner un feedback", d: "Choisissez la personne, la mission, puis nominatif ou anonyme. Quatre étapes courtes." }, { t: "Demander un feedback", d: "Sollicitez les personnes avec qui vous avez travaillé, avec une échéance." }, { t: "Suivre votre objectif", d: "L’anneau de l’accueil montre vos feedbacks reçus et ce qu’il reste à obtenir." }],
  RESPONSABLE: [{ t: "Créer vos missions", d: "Nom, numéro OTP, heures, participants. Vous gérez vos missions et envoyez les liens aux clients." }, { t: "Rédiger une synthèse", d: "Radar sur six compétences ; vous rédigez les points forts et les axes de développement." }, { t: "Suivre l’équipe", d: "Vue par collaborateur : feedbacks reçus, donnés, objectif et statut de la synthèse." }],
  ADMIN_RH: [{ t: "Ouvrir le cycle", d: "Dates, objectifs (feedbacks donnés et reçus), retour obligatoire et rappels. L’archivage est automatique à la fin." }, { t: "Suivre la participation", d: "Demandes sans réponse, retours obligatoires non réalisés : relancez depuis Suivi & rappels." }, { t: "Régler la visibilité", d: "Qui voit quoi, avec un aperçu « Voir en tant que… » en direct. Les missions sont gérées par les responsables." }],
  ADMIN_TECH: [{ t: "Gérer les comptes", d: "Attribuez les rôles ; au moins un Admin RH doit rester actif." }, { t: "Sauvegarder", d: "Sauvegarde quotidienne, création manuelle et restauration sécurisée." }, { t: "Aucun accès aux feedbacks", d: "Le rôle technique ne voit ni feedback ni synthèse." }],
};
const GLOSSARY: Array<[string, string]> = [["Cycle", "Période annuelle nommée par les RH, archivée automatiquement."], ["Mission", "Travail partagé avec un nom, des dates, des participants et un responsable."], ["Feedback", "Retour écrit d’une personne à une autre sur sa contribution à une mission."], ["Demande", "Sollicitation d’un feedback envoyée à des collègues."], ["Nominatif / Anonyme", "Auteur connu / auteur enregistré nulle part."], ["Relation", "Responsable, Pair ou Équipe — du donneur vers le destinataire."], ["Synthèse", "Document de fin d’année par collaborateur : radar, points forts, axes."]];

export default function AidePage() {
  const { me } = useSession();
  const shell = useShell();
  const [open, setOpen] = useState<number | null>(null);
  if (!me) return null;
  return (
    <div>
      <PageHeader title="Aide & anonymat" description={`Repères pour le profil « ${roleLabel[me.role]} ».`} actions={<Button variant="secondary" icon={<Route className="size-4" />} onClick={shell.startTour}>Relancer la visite guidée</Button>} />
      <div className="grid gap-4 md:grid-cols-3">{QUICK[me.role].map((q, i) => <Card key={q.t}><span className="font-display text-lg text-accent">{String(i + 1).padStart(2, "0")}</span><h2 className="mt-2 text-md font-semibold text-ink">{q.t}</h2><p className="mt-1 text-sm text-text-secondary text-pretty">{q.d}</p></Card>)}</div>
      <Link href="/app/aide/anonymat" className="mt-6 flex items-center justify-between rounded-lg bg-ink p-5 text-white transition-colors hover:bg-ink-soft"><span><span className="block text-md font-semibold">Comment fonctionne l’anonymat</span><span className="text-sm text-white/65">Le schéma, les trois garanties, ce qui est enregistré ou non.</span></span><Compass className="size-6 text-white/60" /></Link>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card padded={false}><h2 className="px-5 pt-5 text-md font-semibold text-ink">Questions fréquentes</h2><ul className="mt-2 divide-y divide-border">{faq.items.map((it, i) => <li key={it.q}><button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-start text-base font-medium text-ink hover:text-accent focus-visible:shadow-none focus-visible:bg-canvas">{it.q}<ChevronDown className={cn("size-4 shrink-0 transition-transform", open === i && "rotate-180")} /></button>{open === i && <p className="px-5 pb-4 text-sm leading-relaxed text-text-secondary text-pretty animate-hero-in">{it.a}</p>}</li>)}</ul></Card>
        <Card><h2 className="mb-3 text-md font-semibold text-ink">Glossaire</h2><dl className="flex flex-col gap-3">{GLOSSARY.map(([k, v]) => <div key={k}><dt className="text-sm font-semibold text-ink">{k}</dt><dd className="text-sm text-text-secondary">{v}</dd></div>)}</dl></Card>
      </div>
    </div>
  );
}

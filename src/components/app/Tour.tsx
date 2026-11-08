"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { dur, ease, spring } from "@/lib/motion-tokens";
import type { Role } from "@/lib/store/types";
import { Button } from "@/components/ui/Button";

interface Step {
  target: string;
  title: string;
  body: string;
}
const COMMON: Step[] = [
  { target: "persona", title: "Changer de profil", body: "Passez d’un profil à l’autre en un clic : la navigation et les droits changent immédiatement." },
  { target: "search", title: "Recherche rapide", body: "⌘K ouvre la palette : pages, personnes, missions et actions rapides." },
  { target: "bell", title: "Notifications", body: "Chaque notification mène à l’objet exact. Les rappels y arrivent aussi." },
];
const STEPS: Record<Role, Step[]> = {
  COLLABORATEUR: [
    { target: "nav-accueil", title: "Votre accueil", body: "Vos tâches, votre objectif de feedbacks reçus et vos missions récentes." },
    { target: "quota", title: "Votre objectif", body: "L’anneau suit votre avancement. Il bouge dès qu’un feedback vous est adressé." },
    { target: "give", title: "Donner un feedback", body: "Disponible partout. Vous choisissez : avec votre nom, ou de façon anonyme." },
    { target: "nav-demandes", title: "Mes demandes", body: "Répondez aux demandes de vos collègues, ou suivez celles que vous avez envoyées." },
    ...COMMON,
    { target: "time", title: "Avancer le temps", body: "Déclenchez les rappels et l’archivage automatique du cycle." },
  ],
  RESPONSABLE: [
    { target: "nav-equipe", title: "Suivi de l’équipe", body: "Les feedbacks reçus par chaque collaborateur, avec leur objectif." },
    { target: "nav-syntheses", title: "Synthèses", body: "Rédigez la synthèse de fin d’année : radar, points forts, axes. Proposition IA optionnelle." },
    { target: "give", title: "Donner un feedback", body: "Vous êtes aussi collaborateur : vous donnez et recevez des feedbacks." },
    ...COMMON,
    { target: "time", title: "Fin de cycle", body: "Passez au scénario ③ pour voir les synthèses à rédiger." },
  ],
  ADMIN_RH: [
    { target: "nav-cycles", title: "Cycles", body: "Ouvrez l’année, réglez les objectifs et rappels. L’archivage est automatique." },
    { target: "nav-missions", title: "Missions", body: "Chaque feedback est rattaché à une mission, avec ses participants." },
    { target: "nav-suivi", title: "Suivi & rappels", body: "Participation, objectifs et relances en un coup d’œil." },
    { target: "nav-client", title: "Feedback client", body: "Créez un lien web par mission ; le client répond sans compte." },
    { target: "nav-parametres", title: "Règles de visibilité", body: "Qui voit quoi est paramétrable, avec un aperçu « Voir en tant que… »." },
    ...COMMON,
  ],
  ADMIN_TECH: [
    { target: "nav-parametres", title: "Sauvegardes", body: "Créez et restaurez des sauvegardes. Aucun accès aux feedbacks." },
    ...COMMON,
  ],
};

export function Tour({ role, open, onClose }: { role: Role; open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const steps = useMemo(() => STEPS[role], [role]);
  const step = steps[i];

  useEffect(() => {
    if (!open || !step) return;
    let raf = 0;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (el && el.offsetParent !== null) {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        setRect(el.getBoundingClientRect());
      } else setRect(null);
    };
    raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => Math.min(steps.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [open, onClose, steps.length]);

  if (typeof document === "undefined") return null;
  const pad = 6;
  const pos = rect
    ? { top: Math.min(window.innerHeight - 220, rect.bottom + 14), left: Math.min(window.innerWidth - 340, Math.max(12, rect.left)) }
    : { top: window.innerHeight / 2 - 90, left: window.innerWidth / 2 - 160 };
  return createPortal(
    <AnimatePresence>
      {open && step && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur.base }} className="fixed inset-0 z-[110]" role="dialog" aria-label="Visite guidée">
          <div className="absolute inset-0" onClick={onClose} />
          {rect && <motion.div layout transition={spring.ui} className="pointer-events-none fixed rounded-lg ring-2 ring-accent" style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px rgb(5 7 3 / 0.55)" }} />}
          {!rect && <div className="pointer-events-none absolute inset-0 bg-ink/55" />}
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: dur.slow, ease: ease.out }} className="fixed w-[min(21em,92vw)] rounded-xl bg-bg p-5 shadow-xl" style={pos}>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-accent">
              Étape {i + 1} / {steps.length}
            </p>
            <h3 className="mt-1.5 text-md font-semibold text-ink">{step.title}</h3>
            <p className="mt-1 text-base text-text-secondary text-pretty">{step.body}</p>
            <div className="mt-4 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Passer
              </Button>
              <span className="flex gap-2">
                {i > 0 && (
                  <Button variant="secondary" size="sm" onClick={() => setI(i - 1)}>
                    Précédent
                  </Button>
                )}
                <Button size="sm" onClick={() => (i === steps.length - 1 ? onClose() : setI(i + 1))}>
                  {i === steps.length - 1 ? "Terminer" : "Suivant"}
                </Button>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

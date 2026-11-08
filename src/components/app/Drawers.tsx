"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { act } from "@/lib/store/store";
import { setNotificationPref } from "@/lib/store/actions";
import { fullName, roleLabel } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import type { NotificationKind } from "@/lib/store/types";
import { Drawer } from "@/components/ui/Overlay";
import { Avatar } from "@/components/ui/Avatar";
import { Switch } from "@/components/ui/FormInputs";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useShell } from "./ShellContext";

const HELP: Record<string, string[]> = {
  accueil: ["Vos tâches du jour en haut : répondez aux demandes et suivez votre objectif.", "Le bouton « Donner un feedback » reste disponible depuis n’importe quelle page.", "Les anneaux se mettent à jour dès qu’un feedback est envoyé."],
  demandes: ["« À traiter » liste les demandes qui vous sont adressées.", "Vous choisissez de répondre avec votre nom ou de façon anonyme.", "« Envoyées » montre vos propres demandes : les réponses anonymes ne sont jamais attribuées."],
  feedbacks: ["« Reçus » regroupe vos feedbacks par mission, avec filtres.", "« Envoyés » ne liste que les feedbacks nominatifs.", "Les feedbacks anonymes ne peuvent pas être retrouvés, même par leur auteur."],
  default: ["Utilisez ⌘K pour naviguer vite entre les pages, les personnes et les missions.", "Les rôles déterminent ce que vous voyez : changez de profil depuis la barre de démonstration.", "« Aide & anonymat » explique pas à pas le principe de confidentialité."],
};

export function HelpDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const path = usePathname();
  const shell = useShell();
  const key = path.split("/")[2] ?? "default";
  const tips = HELP[key] ?? HELP.default;
  return (
    <Drawer open={open} onClose={onClose} title="Aide" subtitle="Trois repères pour cette page." width="28em">
      <ol className="flex flex-col gap-4">
        {tips.map((t, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{i + 1}</span>
            <p className="pt-0.5 text-base text-text-secondary text-pretty">{t}</p>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6">
        <Link href="/app/aide/anonymat" onClick={onClose} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-base font-medium text-ink transition-colors hover:bg-paper">
          Comment fonctionne l’anonymat <ArrowRight className="size-4" />
        </Link>
        <Button variant="secondary" onClick={() => { onClose(); shell.startTour(); }}>
          Relancer la visite guidée
        </Button>
      </div>
    </Drawer>
  );
}

const PREFS: Array<[NotificationKind, string]> = [
  ["DEMANDE", "Demandes de feedback"],
  ["RAPPEL", "Rappels"],
  ["FEEDBACK", "Feedbacks reçus"],
  ["SYNTHESE", "Synthèses"],
  ["CLIENT", "Retours client"],
  ["SYSTEME", "Messages système"],
];

export function ProfileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, me } = useSession();
  const toast = useToast();
  if (!me) return null;
  const leader = s.users.find((u) => me.leaderIds.includes(u.id));
  const dept = s.departments.find((d) => d.id === me.departmentId);
  return (
    <Drawer open={open} onClose={onClose} title="Mon profil" subtitle="Identité en lecture seule et préférences de notification." width="28em" footer={<><span /><Button onClick={() => { toast({ title: "Préférences enregistrées" }); onClose(); }}>Enregistrer</Button></>}>
      <div className="flex items-center gap-4">
        <Avatar user={me} dept={dept} size="xl" />
        <div>
          <p className="text-lg font-semibold text-ink">{fullName(me)}</p>
          <p className="text-sm text-text-secondary">{me.jobTitle}</p>
          <p className="text-xs text-text-muted">{roleLabel[me.role]}</p>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
        {[
          ["Matricule", me.matricule],
          ["Département", dept?.name ?? "—"],
          ["Grade", me.grade],
          ["Responsable", leader ? fullName(leader) : "—"],
          ["E-mail", me.email],
        ].map(([k, v]) => (
          <div key={k} className={k === "E-mail" ? "col-span-2" : ""}>
            <dt className="text-xs text-text-muted">{k}</dt>
            <dd className="mt-0.5 font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <h3 className="mt-8 text-md font-semibold text-ink">Préférences de notification</h3>
      <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
        {PREFS.map(([k, label]) => (
          <li key={k} className="flex items-center justify-between px-4 py-3 text-base text-text">
            {label}
            <Switch checked={s.settings.notificationPrefs[k]} onChange={(v) => act((d) => setNotificationPref(d, k, v))} label={label} />
          </li>
        ))}
      </ul>
    </Drawer>
  );
}

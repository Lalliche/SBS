"use client";
import { DatabaseBackup, ShieldCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { act } from "@/lib/store/store";
import { createBackup } from "@/lib/store/actions";
import { fmtDate } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Surface";
import { Callout } from "@/components/ui/Surface";
import { useToast } from "@/components/ui/Toast";
import { Kpi } from "../Kpi";

export function TechHome() {
  const { s, me } = useSession();
  const router = useRouter();
  const toast = useToast();
  const last = s.backups[0];
  const events = s.adminEvents.filter((e) => e.category === "Sécurité" || e.category === "Paramètres").slice(0, 5);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Comptes actifs" value={s.users.filter((u) => u.status === "ACTIF").length} href="/app/utilisateurs" hint={`${s.users.filter((u) => u.role === "ADMIN_RH").length} admin RH · ${s.users.filter((u) => u.role === "RESPONSABLE").length} responsables`} />
        <Kpi label="Sauvegardes" value={s.backups.length} href="/app/parametres" hint={last ? `Dernière : ${fmtDate(last.ts)} · ${last.sizeKb} Ko` : "Aucune"} />
        <Kpi label="Rétention" value={s.settings.retentionDays} suffix=" j" hint="Durée de conservation des sauvegardes" />
      </div>
      <Callout tone="info" title="Aucun accès aux feedbacks">L’administrateur technique gère les comptes, les rôles et les sauvegardes. Les feedbacks et les synthèses ne lui sont pas accessibles.</Callout>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Événements techniques récents" />
          <ul className="divide-y divide-border">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-3 text-base">
                <ShieldCheck className="size-4 text-text-muted" />
                <span className="flex-1 text-text">{e.action}<span className="text-text-muted"> — {e.target}</span></span>
                <span className="text-xs text-text-muted">{fmtDate(e.ts)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Actions" />
          <div className="flex flex-col gap-2.5">
            <Button icon={<DatabaseBackup className="size-4" />} onClick={() => { act((d) => createBackup(d, me!.id)); toast({ title: "Sauvegarde créée", body: "Elle apparaît dans Paramètres › Données & sauvegarde." }); }}>Créer une sauvegarde</Button>
            <Button variant="secondary" icon={<Users className="size-4" />} onClick={() => router.push("/app/utilisateurs")}>Gérer les utilisateurs</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

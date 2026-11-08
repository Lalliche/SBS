"use client";
import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { Action } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Surface";

/** Route guard: renders a 403 empty state when the persona lacks the permission. */
export function Guard({ action, children, any }: { action?: Action; any?: Action[]; children: ReactNode }) {
  const { can, me } = useSession();
  const ok = !me ? false : any ? any.some(can) : action ? can(action) : true;
  if (ok) return <>{children}</>;
  return (
    <EmptyState icon={ShieldAlert} title="Accès non autorisé (403)" description="Votre profil ne donne pas accès à cette page. Changez de profil depuis la barre de démonstration, ou revenez à l’accueil." action={<Button href="/app/accueil" variant="secondary">Retour à l’accueil</Button>} className="py-24" />
  );
}

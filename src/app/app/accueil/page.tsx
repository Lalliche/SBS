"use client";
import { useSession } from "@/lib/store/hooks";
import { fmtDateLong } from "@/lib/store/engine";
import { Callout, PageHeader, Skeleton } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { useFirstLoad } from "@/components/app/useSkeleton";
import { CollabTasks, GiveCard, LatestReceived, QuotaCard, RecentMissions } from "@/components/app/home/Collab";
import { RecentTeamFeedback, SynthesesToWrite, TeamOverview } from "@/components/app/home/Team";
import { RhHome } from "@/components/app/home/Rh";
import { TechHome } from "@/components/app/home/Tech";

function greeting(role: string, name: string, tasks: string) {
  return { title: `Bonjour, ${name}`, description: tasks, role };
}

export default function AccueilPage() {
  const { s, me } = useSession();
  const loading = useFirstLoad();
  if (!me) return null;
  const desc: Record<string, string> = {
    COLLABORATEUR: `Nous sommes le ${fmtDateLong(s.now)}. Voici où vous en êtes sur ce cycle.`,
    RESPONSABLE: `Nous sommes le ${fmtDateLong(s.now)}. Vos feedbacks, votre équipe et vos synthèses.`,
    ADMIN_RH: `Nous sommes le ${fmtDateLong(s.now)}. Le pilotage du cycle en un coup d’œil.`,
    ADMIN_TECH: "Comptes, rôles et sauvegardes.",
  };
  const g = greeting(me.role, me.firstName, desc[me.role]);
  if (loading)
    return (
      <div>
        <PageHeader title={g.title} description={g.description} />
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-64 xl:col-span-2" />
          <Skeleton className="h-64" />
          <Skeleton className="h-48 xl:col-span-3" />
        </div>
      </div>
    );
  return (
    <div>
      <PageHeader title={g.title} description={g.description} />
      {me.role === "ADMIN_RH" && <RhHome />}
      {me.role === "ADMIN_TECH" && <TechHome />}
      {(me.role === "COLLABORATEUR" || me.role === "RESPONSABLE") && (
        <div className="flex flex-col gap-6">
          {s.settings.visibility.seeOwnSynthesis && s.syntheses.some((x) => x.userId === me.id && x.status === "VALIDEE" && x.cycleId === "cy-fy27") && (
            <Callout tone="success" title="Votre synthèse est disponible" action={<Button size="sm" variant="secondary" href={`/app/syntheses/${me.id}`}>Consulter</Button>}>
              Votre responsable a validé votre synthèse de fin d’année.
            </Callout>
          )}
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <CollabTasks />
            <div className="flex flex-col gap-6">
              <QuotaCard />
              <GiveCard />
            </div>
          </div>
          {me.role === "RESPONSABLE" && (
            <>
              <TeamOverview />
              <div className="grid gap-6 xl:grid-cols-2">
                <SynthesesToWrite />
                <RecentTeamFeedback />
              </div>
            </>
          )}
          <div className="grid gap-6 xl:grid-cols-2">
            <RecentMissions />
            <LatestReceived />
          </div>
        </div>
      )}
    </div>
  );
}

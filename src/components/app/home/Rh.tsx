"use client";
import { AlertTriangle, CalendarClock, Inbox, ShieldCheck, Siren, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { act } from "@/lib/store/store";
import { sendReminders, remindRequest } from "@/lib/store/actions";
import { daysBetween } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { feedbackSeries, participationByDepartment, quotaFor, rhKpis, activeUsers } from "@/lib/store/selectors";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, EmptyState } from "@/components/ui/Surface";
import { LineChart } from "@/components/charts/LineChart";
import { BarList } from "@/components/charts/BarList";
import { Sparkline } from "@/components/charts/Sparkline";
import { Kpi } from "../Kpi";
import { useToast } from "@/components/ui/Toast";

export function RhHome() {
  const { s, open, me } = useSession();
  const router = useRouter();
  const toast = useToast();
  const k = rhKpis(s);
  const series = feedbackSeries(s, open.id, 12);
  const byDept = participationByDepartment(s);
  const behind = activeUsers(s).filter((u) => u.role !== "ADMIN_TECH" && !quotaFor(s, u.id, open.id).reached);
  const overdue = s.tasks.filter((t) => t.status === "EN_ATTENTE").map((t) => s.requests.find((r) => r.id === t.requestId)!).filter((r) => r && daysBetween(r.dueDate, s.now) > 0);
  const overdueGivers = [...new Set(s.tasks.filter((t) => t.status === "EN_ATTENTE" && overdue.some((r) => r.id === t.requestId)).map((t) => t.giverId))];
  const mandatoryLate = behind.filter((u) => quotaFor(s, u.id, open.id).mandatory && quotaFor(s, u.id, open.id).missingGiven > 0);
  const unvalidated = s.syntheses.filter((x) => x.cycleId === open.id && x.status !== "VALIDEE");
  const attention = [
    behind.length > 0 && { id: "q", icon: <Siren className="size-4" />, text: `${behind.length} collaborateurs sous l’objectif`, action: "Relancer", run: () => { act((d) => sendReminders(d, me?.id ?? null, "OBJECTIF", "t-rappel-objectif", behind.map((b) => b.id))); toast({ title: `${behind.length} rappels envoyés` }); } },
    overdue.length > 0 && { id: "d", icon: <Inbox className="size-4" />, text: `${overdue.length} demande${overdue.length > 1 ? "s" : ""} de feedback sans réponse après l’échéance`, action: "Relancer", run: () => { act((d) => overdue.forEach((r) => remindRequest(d, r.id))); toast({ title: `${overdueGivers.length} rappel${overdueGivers.length > 1 ? "s" : ""} envoyé${overdueGivers.length > 1 ? "s" : ""}` }); } },
    mandatoryLate.length > 0 && { id: "m", icon: <ShieldCheck className="size-4" />, text: `${mandatoryLate.length} retour${mandatoryLate.length > 1 ? "s" : ""} obligatoire${mandatoryLate.length > 1 ? "s" : ""} non réalisé${mandatoryLate.length > 1 ? "s" : ""}`, action: "Suivre", run: () => router.push("/app/suivi") },
    s.scenario === 3 && unvalidated.length > 0 && { id: "s", icon: <CalendarClock className="size-4" />, text: `${unvalidated.length} synthèses ne sont pas encore validées`, action: "Suivre", run: () => router.push("/app/cycles") },
  ].filter(Boolean) as Array<{ id: string; icon: React.ReactNode; text: string; action: string; run: () => void }>;
  const daily = series.map((x) => x.named + x.anonymous);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Feedbacks du cycle" value={k.total} href="/app/suivi" hint={`${k.named} nominatifs · ${k.anonymous} anonymes`} spark={<Sparkline values={daily} />} />
        <Kpi label="Participation" value={Math.round(k.participation * 100)} suffix=" %" href="/app/suivi" hint={`${k.participants} sur ${k.staff} ont donné au moins un feedback nominatif ou répondu à une demande`} />
        <Kpi label="Objectifs atteints" value={k.reached} href="/app/suivi" hint={`sur ${k.staff} collaborateurs`} />
        <Kpi label="Synthèses validées" value={k.validated} href="/app/cycles" hint={`sur ${k.synthesesTotal} à rédiger`} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Feedbacks dans le cycle" description="Par semaine : nominatifs et anonymes." />
          <LineChart labels={series.map((x) => x.label)} series={[{ id: "n", label: "Nominatifs", values: series.map((x) => x.named), color: "var(--color-ink)", marker: "circle" }, { id: "a", label: "Anonymes", values: series.map((x) => x.anonymous), color: "var(--color-series-team)", dash: "6 4", marker: "square" }]} />
        </Card>
        <Card>
          <CardHeader title="Objectifs atteints par département" />
          <BarList rows={byDept.map((d) => ({ id: d.department.id, label: d.department.name, sub: `${d.reached}/${d.people}`, value: d.ratio, display: `${Math.round(d.ratio * 100)} %` }))} />
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Points d’attention" />
          {attention.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="Rien à signaler" description="Les objectifs et les liens client sont en ordre." className="py-8" />
          ) : (
            <ul className="divide-y divide-border">
              {attention.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-warning-bg text-warning">{a.icon}</span>
                  <span className="flex-1 text-base text-text">{a.text}</span>
                  <Button size="sm" variant="secondary" onClick={a.run}>{a.action}</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Actions rapides" />
          <div className="flex flex-col gap-2.5">
            <Button variant="secondary" className="justify-start" icon={<Siren className="size-4" />} onClick={() => router.push("/app/suivi")}>Ouvrir Suivi & rappels</Button>
            <Button variant="secondary" className="justify-start" icon={<Users className="size-4" />} onClick={() => router.push("/app/collaborateurs")}>Gérer les collaborateurs</Button>
          </div>
          <Link href="/app/parametres" className="mt-4 block text-sm text-text-secondary underline-offset-2 hover:text-ink hover:underline">Règles de visibilité et objectifs →</Link>
        </Card>
      </div>
    </div>
  );
}

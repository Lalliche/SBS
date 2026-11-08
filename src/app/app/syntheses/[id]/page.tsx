"use client";
import { use, useState } from "react";
import { notFound } from "next/navigation";
import { useSession } from "@/lib/store/hooks";
import { SynthesisView } from "@/components/synthesis/SynthesisView";
import { Guard } from "@/components/app/Guard";

export default function SynthesisPage({ params }: PageProps<"/app/syntheses/[id]">) {
  const { id } = use(params);
  const { s, me, open } = useSession();
  const [cycleId, setCycleId] = useState<string | null>(null);
  if (!me) return null;
  const user = s.users.find((u) => u.id === id);
  if (!user) return notFound();
  const isLeader = user.leaderIds.includes(me.id);
  const isSelf = me.id === id;
  const sy = s.syntheses.find((x) => x.userId === id && x.cycleId === (cycleId ?? open.id));
  const allowed = isLeader || (isSelf && s.settings.visibility.seeOwnSynthesis && (sy?.status === "VALIDEE" || (cycleId && s.cycles.find((c) => c.id === cycleId)?.status === "ARCHIVE")));
  return (
    <Guard action={allowed ? undefined : "synthesis.write"}>
      {allowed ? <SynthesisView userId={id} cycleId={cycleId ?? open.id} onCycleChange={setCycleId} /> : null}
    </Guard>
  );
}

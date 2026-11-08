"use client";
import { useMemo, useState } from "react";
import { act } from "@/lib/store/store";
import { createRequest } from "@/lib/store/actions";
import { addDays, fmtDate, relationOf } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { pendingTasks } from "@/lib/store/selectors";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Overlay";
import { SelectInput, Switch, TextArea, Field } from "@/components/ui/FormInputs";
import { useToast } from "@/components/ui/Toast";
import { Callout } from "@/components/ui/Surface";
import { PeoplePicker } from "./PeoplePicker";

export function RequestDrawer({ open, onClose, missionId: initialMission, recipientIds: initialRecipients }: { open: boolean; onClose: () => void; missionId?: string; recipientIds?: string[] }) {
  // Remount the form whenever the drawer opens so it starts from fresh defaults.
  return (
    <Drawer open={open} onClose={onClose} title="Demander un feedback" subtitle="Choisissez la mission et les personnes avec qui vous avez travaillé." width="35em">
      {open && <Form key={`${initialMission}-${(initialRecipients ?? []).join()}`} onClose={onClose} initialMission={initialMission} initialRecipients={initialRecipients} />}
    </Drawer>
  );
}

function Form({ onClose, initialMission, initialRecipients }: { onClose: () => void; initialMission?: string; initialRecipients?: string[] }) {
  const { s, me, readOnly } = useSession();
  const toast = useToast();
  const myMissions = useMemo(() => s.missions.filter((m) => me && m.participantIds.includes(me.id)), [s.missions, me]);
  const [missionId, setMissionId] = useState(initialMission ?? myMissions[0]?.id ?? "");
  const [picked, setPicked] = useState<string[]>(initialRecipients ?? []);
  const [message, setMessage] = useState("");
  const [due, setDue] = useState(addDays(s.now, 14).slice(0, 10));
  const [anon, setAnon] = useState(true);
  const [touched, setTouched] = useState(false);
  if (!me) return null;
  const mission = s.missions.find((m) => m.id === missionId);
  const candidates = s.users.filter((u) => u.id !== me.id && u.status === "ACTIF" && u.role !== "ADMIN_TECH");
  const suggested = mission ? mission.participantIds.filter((id) => id !== me.id) : [];
  const pool = mission ? [...candidates.filter((u) => suggested.includes(u.id)), ...candidates.filter((u) => !suggested.includes(u.id))] : candidates;
  const error = touched && !missionId ? "Choisissez une mission." : null;
  const submit = () => {
    setTouched(true);
    if (!missionId || !picked.length) return;
    act((d) => createRequest(d, me.id, { missionId, recipientIds: picked, message: message.trim(), dueDate: new Date(due + "T12:00:00Z").toISOString(), allowAnonymous: s.settings.visibility.allowAnonymousOnRequest ? anon : false }));
    toast({ title: `${picked.length} demande${picked.length > 1 ? "s" : ""} envoyée${picked.length > 1 ? "s" : ""}`, body: `Échéance : ${fmtDate(due)}.` });
    onClose();
  };
  return (
    <div className="flex flex-col gap-5">
      {readOnly && <Callout tone="warning" title="Cycle archivé — lecture seule" />}
      <SelectInput label="Mission" required value={missionId} onChange={(v) => { setMissionId(v); setPicked([]); }} options={myMissions.map((m) => ({ value: m.id, label: m.name }))} placeholder="Choisir une mission" hint={error ?? undefined} />
      <Field label="Personnes à solliciter" required hint="Les participants de la mission sont suggérés en premier.">
        <PeoplePicker
          users={pool}
          departments={s.departments}
          selected={picked}
          onChange={setPicked}
          suggested={suggested}
          relationFor={(u) => relationOf(u, me)}
          hintFor={(u) => {
            const n = pendingTasks(s, u.id).length;
            return n ? `a déjà ${n} demande${n > 1 ? "s" : ""} en attente` : null;
          }}
        />
      </Field>
      <TextArea label="Message" hint="Facultatif — quelques mots pour contextualiser votre demande." value={message} onChange={setMessage} rows={3} max={400} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Échéance" required htmlFor="due">
          <input id="due" type="date" value={due} min={addDays(s.now, 1).slice(0, 10)} onChange={(e) => setDue(e.target.value)} className="h-9 w-full rounded-md border border-border-strong bg-bg px-3 text-base text-text focus-visible:outline-none focus-visible:border-ink" />
        </Field>
        {s.settings.visibility.allowAnonymousOnRequest && (
          <Field label="Réponses anonymes">
            <div className="flex h-9 items-center gap-3">
              <Switch checked={anon} onChange={setAnon} label="Autoriser les réponses anonymes" />
              <span className="text-sm text-text-secondary">{anon ? "Autorisées" : "Nominatives"}</span>
            </div>
          </Field>
        )}
      </div>
      <div className="sticky bottom-0 -mx-6 -mb-5 mt-1 flex items-center justify-between border-t border-border bg-bg/95 px-6 py-3 backdrop-blur">
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={submit} disabled={readOnly}>
          {picked.length ? `Envoyer ${picked.length} demande${picked.length > 1 ? "s" : ""}` : "Envoyer les demandes"}
        </Button>
      </div>
      {touched && !picked.length && <p role="alert" className="-mt-2 text-xs text-danger">Sélectionnez au moins une personne.</p>}
    </div>
  );
}

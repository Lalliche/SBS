"use client";
import { Send } from "lucide-react";
import { useMemo, useState } from "react";
import { act } from "@/lib/store/store";
import { createRequest } from "@/lib/store/actions";
import { addDays, fmtDate, fullName, suggestedRelation } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { pendingTasks } from "@/lib/store/selectors";
import { Button } from "@/components/ui/Button";
import { Drawer, Modal } from "@/components/ui/Overlay";
import { SearchInput, SelectInput, Switch, TextArea, TextInput, Field } from "@/components/ui/FormInputs";
import { useToast } from "@/components/ui/Toast";
import { Callout } from "@/components/ui/Surface";
import { PeoplePicker } from "./PeoplePicker";

export function RequestDrawer({ open, onClose, missionId: initialMission, recipientIds: initialRecipients }: { open: boolean; onClose: () => void; missionId?: string; recipientIds?: string[] }) {
  // Remount the form whenever the drawer opens so it starts from fresh defaults.
  return (
    <Drawer open={open} onClose={onClose} title="Demander un feedback" subtitle="Choisissez les personnes à solliciter. Une mission est possible, pas obligatoire." width="35em">
      {open && <Form key={`${initialMission}-${(initialRecipients ?? []).join()}`} onClose={onClose} initialMission={initialMission} initialRecipients={initialRecipients} />}
    </Drawer>
  );
}

function Form({ onClose, initialMission, initialRecipients }: { onClose: () => void; initialMission?: string; initialRecipients?: string[] }) {
  const { s, me, readOnly } = useSession();
  const toast = useToast();
  const myMissions = useMemo(() => s.missions.filter((m) => me && m.participantIds.includes(me.id)), [s.missions, me]);
  const [missionId, setMissionId] = useState(initialMission ?? "");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [hours, setHours] = useState("");
  const [picked, setPicked] = useState<string[]>(initialRecipients ?? []);
  const [message, setMessage] = useState("");
  const [due, setDue] = useState(addDays(s.now, 14).slice(0, 10));
  const [anon, setAnon] = useState(true);
  const [touched, setTouched] = useState(false);
  const [recap, setRecap] = useState(false);
  if (!me) return null;
  const mission = s.missions.find((m) => m.id === missionId);
  // Anyone can be asked, at any level; participants of the chosen mission come first.
  const candidates = s.users.filter((u) => u.id !== me.id && u.status === "ACTIF" && u.role !== "ADMIN_TECH");
  const suggested = mission ? mission.participantIds.filter((id) => id !== me.id) : [];
  const pool = mission ? [...candidates.filter((u) => suggested.includes(u.id)), ...candidates.filter((u) => !suggested.includes(u.id))] : candidates;
  const q = search.trim().toLowerCase();
  const missionOptions = [{ value: "", label: "Aucune mission" }, ...myMissions.filter((m) => !q || `${m.name} ${m.otp}`.toLowerCase().includes(q) || m.id === missionId).map((m) => ({ value: m.id, label: `${m.name} · ${m.otp}` }))];
  const roleError = touched && mission && !role.trim() ? "Décrivez votre rôle sur la mission." : null;
  const hoursNum = hours.trim() ? Number(hours.replace(",", ".")) : undefined;
  const hoursError = touched && hours.trim() && !(hoursNum && hoursNum > 0) ? "Indiquez un nombre d’heures valide." : null;
  const review = () => {
    setTouched(true);
    if (!picked.length || (mission && !role.trim()) || (hours.trim() && !(hoursNum && hoursNum > 0))) return;
    setRecap(true);
  };
  const submit = () => {
    act((d) => createRequest(d, me.id, { missionId: mission ? missionId : null, role: mission ? role : undefined, hours: mission ? hoursNum : undefined, recipientIds: picked, message: message.trim(), dueDate: new Date(due + "T12:00:00Z").toISOString(), allowAnonymous: s.settings.visibility.allowAnonymousOnRequest ? anon : false }));
    toast({ title: `${picked.length} demande${picked.length > 1 ? "s" : ""} envoyée${picked.length > 1 ? "s" : ""}`, body: `Échéance : ${fmtDate(due)}.` });
    setRecap(false);
    onClose();
  };
  return (
    <div className="flex flex-col gap-5">
      {readOnly && <Callout tone="warning" title="Cycle archivé — lecture seule" />}
      <div className="flex flex-col gap-2">
        {myMissions.length > 4 && <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une mission par nom ou OTP…" />}
        <SelectInput label="Mission" value={missionId} onChange={(v) => { setMissionId(v); setPicked([]); }} options={missionOptions} hint="Facultatif. Vous pouvez demander un feedback sans mission." />
      </div>
      {mission && (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-canvas p-4">
          <TextArea label="Votre rôle sur la mission" required value={role} onChange={setRole} rows={3} max={400} placeholder="Ex. : cadrage, animation des ateliers, rédaction du diagnostic…" hint="Ce que votre feedback doit couvrir, pour que la personne sollicitée sache de quoi vous parlez." error={roleError} />
          <TextInput label="Heures passées sur la mission" type="number" value={hours} onChange={setHours} placeholder="Facultatif" hint="Informatif : il n’y a aucun minimum d’heures." error={hoursError} />
        </div>
      )}
      <Field label="Personnes à solliciter" required hint={mission ? "Les participants de la mission sont suggérés en premier. Vous pouvez aussi solliciter n’importe qui, à tout niveau." : "Vous pouvez solliciter n’importe qui, à tout niveau."} error={touched && !picked.length ? "Sélectionnez au moins une personne." : null}>
        <PeoplePicker
          users={pool}
          departments={s.departments}
          selected={picked}
          onChange={setPicked}
          suggested={suggested}
          relationFor={(u) => suggestedRelation(u, me)}
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
        <Button onClick={review} disabled={readOnly}>
          Relire et envoyer
        </Button>
      </div>
      <Modal open={recap} onClose={() => setRecap(false)} title="Relire votre demande" subtitle="Vérifiez avant l’envoi : les personnes sollicitées la recevront aussi par e-mail." footer={<><Button variant="ghost" onClick={() => setRecap(false)}>Modifier</Button><Button icon={<Send className="size-4" />} onClick={submit}>{`Envoyer ${picked.length} demande${picked.length > 1 ? "s" : ""}`}</Button></>}>
        <dl className="grid grid-cols-[8em_1fr] gap-x-4 gap-y-3 text-sm">
          <dt className="text-text-muted">Mission</dt><dd className="font-medium text-ink">{mission ? `${mission.name} · ${mission.otp}` : "Aucune"}</dd>
          {mission && <><dt className="text-text-muted">Votre rôle</dt><dd className="text-text text-pretty">{role.trim()}</dd></>}
          {mission && hoursNum && <><dt className="text-text-muted">Heures</dt><dd className="font-medium text-ink tabular-nums">{hoursNum} h</dd></>}
          <dt className="text-text-muted">Personnes</dt>
          <dd className="font-medium text-ink">{picked.map((id) => s.users.find((u) => u.id === id)).filter((u): u is NonNullable<typeof u> => !!u).map((u) => fullName(u)).join(", ")}</dd>
          <dt className="text-text-muted">Échéance</dt><dd className="font-medium text-ink">{fmtDate(due)}</dd>
          {message.trim() && <><dt className="text-text-muted">Message</dt><dd className="text-text text-pretty">« {message.trim()} »</dd></>}
        </dl>
      </Modal>
    </div>
  );
}

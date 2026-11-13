"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { act } from "@/lib/store/store";
import { createMission } from "@/lib/store/actions";
import { fullName } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Overlay";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/FormInputs";
import { useToast } from "@/components/ui/Toast";
import { PeoplePicker } from "./PeoplePicker";
import { useShell } from "./ShellContext";

export function MissionDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Drawer open={open} onClose={onClose} title="Nouvelle mission" subtitle="Une mission rattache les feedbacks au travail réellement réalisé." width="36em">
      {open && <Form onClose={onClose} />}
    </Drawer>
  );
}

function Form({ onClose }: { onClose: () => void }) {
  const { s, me } = useSession();
  const toast = useToast();
  const router = useRouter();
  const shell = useShell();
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [hours, setHours] = useState("");
  const [desc, setDesc] = useState("");
  const [start, setStart] = useState(s.now.slice(0, 10));
  const [end, setEnd] = useState("");
  const [lead, setLead] = useState("");
  const [people, setPeople] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);
  if (!me) return null;
  const staff = s.users.filter((u) => u.status === "ACTIF" && u.role !== "ADMIN_TECH");
  const errs = { name: !name.trim() ? "Le nom est obligatoire." : null, otp: !otp.trim() ? "Le numéro OTP est obligatoire." : null, hours: Number(hours) > 0 ? null : "Indiquez un nombre d’heures.", end: !end ? "La date de fin est obligatoire." : end < start ? "La fin doit suivre le début." : null, lead: !lead ? "Choisissez un responsable de mission." : null, people: !people.length ? "Ajoutez au moins un participant." : null };
  const invalid = Object.values(errs).some(Boolean);
  const create = (andRequest: boolean) => {
    setTouched(true);
    if (invalid) return;
    const ids = [...new Set([...people, lead])];
    const id = act((d) => createMission(d, me.id, { name: name.trim(), otp: otp.trim().toUpperCase(), hours: Number(hours), description: desc.trim(), startDate: new Date(start + "T00:00:00Z").toISOString(), endDate: new Date(end + "T00:00:00Z").toISOString(), leadId: lead, participantIds: ids }));
    toast({ title: "Mission créée", body: name.trim() });
    onClose();
    router.push(`/app/missions/${id}`);
    if (andRequest) setTimeout(() => shell.openRequest({ missionId: id }), 500);
  };
  return (
    <div className="flex flex-col gap-5">
      <TextInput label="Nom" required value={name} onChange={setName} error={touched ? errs.name : null} placeholder="Ex. Diagnostic organisationnel" />
      <div className="grid grid-cols-2 gap-4">
        <TextInput label="Numéro OTP" required value={otp} onChange={setOtp} error={touched ? errs.otp : null} placeholder="OTP-26-0150" />
        <TextInput label="Durée en heures" required type="number" value={hours} onChange={setHours} error={touched ? errs.hours : null} hint="Nombre d’heures budgétées" />
      </div>
      <TextArea label="Description" value={desc} onChange={setDesc} rows={3} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Début" required>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 w-full rounded-md border border-border-strong bg-bg px-3 text-base focus-visible:outline-none focus-visible:border-ink" />
        </Field>
        <Field label="Fin" required error={touched ? errs.end : null}>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 w-full rounded-md border border-border-strong bg-bg px-3 text-base focus-visible:outline-none focus-visible:border-ink" />
        </Field>
      </div>
      <SelectInput label="Responsable de mission" required value={lead} onChange={setLead} placeholder="Choisir une personne" options={staff.map((u) => ({ value: u.id, label: fullName(u) }))} hint={touched ? (errs.lead ?? undefined) : undefined} />
      <Field label="Participants" required error={touched ? errs.people : null}>
        <PeoplePicker users={staff} departments={s.departments} selected={people} onChange={setPeople} />
      </Field>
      <div className="sticky bottom-0 -mx-6 -mb-5 flex items-center justify-between gap-2 border-t border-border bg-bg/95 px-6 py-3 backdrop-blur">
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <span className="flex gap-2">
          <Button variant="secondary" onClick={() => create(true)}>
            Créer et demander des feedbacks
          </Button>
          <Button onClick={() => create(false)}>Créer la mission</Button>
        </span>
      </div>
      {touched && invalid && <p role="alert" className="-mt-2 text-xs text-danger">Complétez les champs marqués d’une erreur.</p>}
    </div>
  );
}

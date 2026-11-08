"use client";
import { UserCog } from "lucide-react";
import { useState } from "react";
import { act } from "@/lib/store/store";
import { setRole } from "@/lib/store/actions";
import { fmtDate, roleLabel } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import type { Role, User } from "@/lib/store/types";
import { Guard } from "@/components/app/Guard";
import { PersonChip } from "@/components/ui/Avatar";
import { Badge, StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { SelectInput } from "@/components/ui/FormInputs";
import { Modal } from "@/components/ui/Overlay";
import { Callout, EmptyState, PageHeader } from "@/components/ui/Surface";
import { useToast } from "@/components/ui/Toast";

export default function UsersPage() {
  const { s, me } = useSession();
  const toast = useToast();
  const [u, setU] = useState<User | null>(null);
  const [role, setR] = useState<Role>("COLLABORATEUR");
  const [err, setErr] = useState<string | null>(null);
  if (!me) return null;
  return (
    <Guard action="roles.manage">
      <PageHeader title="Utilisateurs & rôles" description="Comptes, rôles et accès. L’administrateur technique n’a accès à aucun feedback." />
      <DataTable<User>
        caption="Utilisateurs"
        rows={s.users}
        getId={(x) => x.id}
        empty={<EmptyState icon={UserCog} title="Aucun utilisateur" />}
        columns={[
          { key: "n", header: "Utilisateur", sort: (a, b) => a.lastName.localeCompare(b.lastName), cell: (x) => <PersonChip user={x} dept={s.departments.find((d) => d.id === x.departmentId)} sub={x.email} /> },
          { key: "r", header: "Rôle", cell: (x) => <Badge tone={x.role === "ADMIN_RH" || x.role === "ADMIN_TECH" ? "ink" : "neutral"}>{roleLabel[x.role]}</Badge> },
          { key: "l", header: "Dernière connexion", hideBelow: "md", cell: (x) => <span className="text-text-secondary">{fmtDate(x.lastLogin)}</span> },
          { key: "s", header: "Statut", cell: (x) => <StatusPill status={x.status} /> },
        ]}
        rowActions={(x) => <Button size="sm" variant="secondary" onClick={() => { setU(x); setR(x.role); setErr(null); }}>Attribuer un rôle</Button>}
      />
      <Modal open={!!u} onClose={() => setU(null)} title="Attribuer un rôle" subtitle={u ? `${u.firstName} ${u.lastName}` : ""} footer={<><Button variant="ghost" onClick={() => setU(null)}>Annuler</Button><Button onClick={() => { const ok = act((d) => setRole(d, me.id, u!.id, role)); if (!ok) return setErr("Au moins un Admin RH doit rester actif."); setU(null); toast({ title: "Rôle mis à jour" }); }}>Enregistrer</Button></>}>
        <SelectInput label="Rôle" value={role} onChange={setR} options={(Object.keys(roleLabel) as Role[]).map((r) => ({ value: r, label: roleLabel[r] }))} />
        {err && <Callout tone="danger" className="mt-4" title={err} />}
      </Modal>
    </Guard>
  );
}

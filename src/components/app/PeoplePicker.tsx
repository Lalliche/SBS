"use client";
import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { fullName, relationLabel } from "@/lib/store/engine";
import type { Department, Relation, User } from "@/lib/store/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/FormInputs";

export function PeoplePicker({
  users,
  departments,
  selected,
  onChange,
  multi = true,
  relationFor,
  hintFor,
  suggested = [],
  disabledIds = [],
  height = "16em",
  showDeptFilter = true,
}: {
  users: User[];
  departments: Department[];
  selected: string[];
  onChange: (ids: string[]) => void;
  multi?: boolean;
  relationFor?: (u: User) => Relation | null;
  hintFor?: (u: User) => string | null;
  suggested?: string[];
  disabledIds?: string[];
  height?: string;
  showDeptFilter?: boolean;
}) {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string>("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return users
      .filter((u) => (dept ? u.departmentId === dept : true))
      .filter((u) => (t ? `${fullName(u)} ${u.jobTitle}`.toLowerCase().includes(t) : true))
      .sort((a, b) => Number(suggested.includes(b.id)) - Number(suggested.includes(a.id)) || a.lastName.localeCompare(b.lastName));
  }, [users, q, dept, suggested]);
  const toggle = (id: string) => {
    if (!multi) return onChange([id]);
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };
  const deptIds = showDeptFilter ? departments.filter((d) => users.some((u) => u.departmentId === d.id)) : [];
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Rechercher une personne…" className="flex-1" />
        {deptIds.length > 1 && (
          <select aria-label="Département" value={dept} onChange={(e) => setDept(e.target.value)} className="h-9 rounded-md border border-border-strong bg-bg px-2 text-sm text-text focus-visible:outline-none">
            <option value="">Tous les départements</option>
            {deptIds.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {multi && dept && (
        <button type="button" onClick={() => onChange([...new Set([...selected, ...list.filter((u) => !disabledIds.includes(u.id)).map((u) => u.id)])])} className="self-start text-xs font-medium text-ink underline underline-offset-2 hover:text-accent">
          Sélectionner tout le département
        </button>
      )}
      <ul className="scroll-thin overflow-y-auto rounded-md border border-border" style={{ maxHeight: height }}>
        {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-text-muted">Aucune personne trouvée</li>}
        {list.map((u) => {
          const on = selected.includes(u.id);
          const disabled = disabledIds.includes(u.id);
          const rel = relationFor?.(u);
          const hint = hintFor?.(u);
          return (
            <li key={u.id} className="border-b border-border last:border-b-0">
              <button type="button" disabled={disabled} onClick={() => toggle(u.id)} aria-pressed={on} className={cn("flex w-full items-center gap-3 px-3 py-2 text-start transition-colors hover:bg-paper focus-visible:shadow-none focus-visible:bg-paper disabled:opacity-40", on && "bg-paper")}>
                <span className={cn("flex size-4 shrink-0 items-center justify-center border", multi ? "rounded-xs" : "rounded-full", on ? "border-ink bg-ink text-white" : "border-border-strong")}>{on && <Check className="size-3" strokeWidth={3} />}</span>
                <Avatar user={u} dept={departments.find((d) => d.id === u.departmentId)} size="sm" />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-base font-medium text-text">{fullName(u)}</span>
                  <span className="block truncate text-xs text-text-muted">
                    {u.jobTitle}
                    {hint ? ` · ${hint}` : ""}
                  </span>
                </span>
                {suggested.includes(u.id) && <Badge tone="info">Suggéré</Badge>}
                {rel && <Badge tone="neutral">{relationLabel[rel]}</Badge>}
                {disabled && <Badge tone="neutral">Indisponible</Badge>}
              </button>
            </li>
          );
        })}
      </ul>
      {multi && <p className="text-xs text-text-muted">{selected.length} sélectionné{selected.length > 1 ? "s" : ""}</p>}
    </div>
  );
}

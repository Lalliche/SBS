"use client";
import { CornerDownLeft, FilePlus2, MessageSquarePlus, Search, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { overlayFade, popIn } from "@/lib/motion-tokens";
import { fullName } from "@/lib/store/engine";
import { useSession } from "@/lib/store/hooks";
import { navFor } from "./nav-config";
import { Avatar } from "@/components/ui/Avatar";

interface Cmd {
  id: string;
  group: "Pages" | "Personnes" | "Missions" | "Actions rapides";
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPalette({ open, onClose, onGive, onRequest, onCreateMission }: { open: boolean; onClose: () => void; onGive: () => void; onRequest: () => void; onCreateMission: () => void }) {
  const { s, me, can } = useSession();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);

  const cmds = useMemo<Cmd[]>(() => {
    if (!me) return [];
    const go = (href: string) => () => router.push(href);
    const list: Cmd[] = [];
    navFor(me.role).forEach((g) => g.items.forEach((i) => list.push({ id: `p-${i.key}`, group: "Pages", label: i.label, hint: g.label, icon: <i.icon className="size-4" />, run: go(i.href) })));
    if (can("users.directory") || me.role === "COLLABORATEUR")
      s.users
        .filter((u) => u.status === "ACTIF" && u.id !== me.id)
        .forEach((u) => {
          const d = s.departments.find((x) => x.id === u.departmentId);
          list.push({ id: `u-${u.id}`, group: "Personnes", label: fullName(u), hint: u.jobTitle, icon: <Avatar user={u} dept={d} size="xs" />, run: me.role === "RESPONSABLE" && u.leaderIds.includes(me.id) ? go(`/app/equipe/${u.id}`) : go(`/app/collaborateurs?q=${encodeURIComponent(u.lastName)}`) });
        });
    const myMissions = can("mission.viewAll") ? s.missions : s.missions.filter((m) => m.participantIds.includes(me.id));
    myMissions.forEach((m) => list.push({ id: `m-${m.id}`, group: "Missions", label: m.name, icon: <FilePlus2 className="size-4" />, run: go(`/app/missions/${m.id}`) }));
    if (can("feedback.give")) {
      list.push({ id: "a-give", group: "Actions rapides", label: "Donner un feedback", icon: <Send className="size-4" />, run: onGive });
      list.push({ id: "a-req", group: "Actions rapides", label: "Demander un feedback", icon: <MessageSquarePlus className="size-4" />, run: onRequest });
    }
    if (can("mission.create")) list.push({ id: "a-mission", group: "Actions rapides", label: "Créer une mission", icon: <FilePlus2 className="size-4" />, run: onCreateMission });
    return list;
  }, [s, me, can, router, onGive, onRequest, onCreateMission]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = t ? cmds.filter((c) => (c.label + " " + (c.hint ?? "")).toLowerCase().includes(t)) : cmds.filter((c) => c.group === "Actions rapides" || c.group === "Pages");
    return base.slice(0, 40);
  }, [cmds, q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => Math.min(results.length - 1, i + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => Math.max(0, i - 1));
      }
      if (e.key === "Enter") {
        const c = results[idx];
        if (c) {
          onClose();
          c.run();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, results, idx, onClose]);

  if (typeof document === "undefined") return null;
  let lastGroup = "";
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-start justify-center px-4 pt-[14vh]">
          <motion.div {...overlayFade} className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div {...popIn} role="dialog" aria-modal="true" aria-label="Palette de commandes" className="relative w-full max-w-[36em] overflow-hidden rounded-xl bg-bg shadow-xl">
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="size-4 text-text-muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setIdx(0);
                }}
                placeholder="Rechercher une page, une personne, une mission…"
                className="h-12 flex-1 bg-transparent text-md text-text outline-none placeholder:text-text-muted"
              />
              <kbd className="rounded border border-border bg-paper px-1.5 py-0.5 text-xs text-text-muted">Esc</kbd>
            </div>
            <ul className="scroll-thin max-h-[22em] overflow-y-auto py-2" role="listbox">
              {results.length === 0 && <li className="px-4 py-8 text-center text-sm text-text-muted">Aucun résultat pour « {q} »</li>}
              {results.map((c, i) => {
                const showGroup = c.group !== lastGroup;
                lastGroup = c.group;
                return (
                  <li key={c.id} role="option" aria-selected={i === idx}>
                    {showGroup && <p className="px-4 pb-1 pt-2 text-xs font-medium text-text-muted">{c.group}</p>}
                    <button
                      type="button"
                      onMouseMove={() => setIdx(i)}
                      onClick={() => {
                        onClose();
                        c.run();
                      }}
                      className={cn("flex w-full items-center gap-3 px-4 py-2 text-start text-base text-text focus-visible:shadow-none", i === idx && "bg-paper")}
                    >
                      <span className="flex size-6 items-center justify-center text-text-secondary">{c.icon}</span>
                      <span className="flex-1 truncate">{c.label}</span>
                      {c.hint && <span className="truncate text-xs text-text-muted">{c.hint}</span>}
                      {i === idx && <CornerDownLeft className="size-3.5 text-text-muted" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

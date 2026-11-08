"use client";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Rows3 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { dur, ease, staggerStep } from "@/lib/motion-tokens";
import { Checkbox } from "./FormInputs";
import { Button, IconButton } from "./Button";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sort?: (a: T, b: T) => number;
  align?: "start" | "end";
  width?: string;
  hideBelow?: "md" | "lg";
}

export function DataTable<T>({
  rows,
  columns,
  getId,
  onRowClick,
  selectable,
  bulk,
  rowActions,
  empty,
  pageSize = 10,
  toolbar,
  caption,
  defaultSort,
}: {
  rows: T[];
  columns: Column<T>[];
  getId: (r: T) => string;
  onRowClick?: (r: T) => void;
  selectable?: boolean;
  bulk?: (selected: T[], clear: () => void) => ReactNode;
  rowActions?: (r: T) => ReactNode;
  empty: ReactNode;
  pageSize?: number;
  toolbar?: ReactNode;
  caption: string;
  defaultSort?: { key: string; dir: "asc" | "desc" };
}) {
  const reduce = useReducedMotion();
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(defaultSort ?? null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(pageSize);
  const [dense, setDense] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const out = [...rows].sort(col.sort);
    return sort.dir === "desc" ? out.reverse() : out;
  }, [rows, sort, columns]);
  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const cur = Math.min(page, pages - 1);
  const view = sorted.slice(cur * size, cur * size + size);
  const selectedRows = rows.filter((r) => picked.includes(getId(r)));
  const allOnPage = view.length > 0 && view.every((r) => picked.includes(getId(r)));

  const toggleSort = (key: string) => setSort((s) => (s?.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" }));
  const hide = (c: Column<T>) => (c.hideBelow === "md" ? "max-md:hidden" : c.hideBelow === "lg" ? "max-lg:hidden" : "");

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">{toolbar}</div>
        <IconButton label={dense ? "Densité confortable" : "Densité compacte"} active={dense} onClick={() => setDense((d) => !d)}>
          <Rows3 className="size-4" />
        </IconButton>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-bg">
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[40em] border-collapse text-base">
            <caption className="sr-only">{caption}</caption>
            <thead className="sticky top-0 z-10 bg-canvas">
              <tr className="border-b border-border">
                {selectable && (
                  <th className="w-10 ps-4">
                    <Checkbox checked={allOnPage} indeterminate={!allOnPage && view.some((r) => picked.includes(getId(r)))} onChange={(v) => setPicked(v ? [...new Set([...picked, ...view.map(getId)])] : picked.filter((id) => !view.some((r) => getId(r) === id)))} label={<span className="sr-only">Tout sélectionner</span>} />
                  </th>
                )}
                {columns.map((c) => {
                  const active = sort?.key === c.key;
                  return (
                    <th key={c.key} scope="col" aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined} style={{ width: c.width }} className={cn("group/th h-10 px-4 text-xs font-semibold uppercase tracking-[0.06em] text-text-muted", c.align === "end" ? "text-end" : "text-start", hide(c))}>
                      {c.sort ? (
                        <button type="button" onClick={() => toggleSort(c.key)} className={cn("inline-flex items-center gap-1 uppercase transition-colors hover:text-ink focus-visible:shadow-none", active && "text-ink")}>
                          {c.header}
                          {active ? sort!.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-0 transition-opacity group-hover/th:opacity-60" />}
                        </button>
                      ) : (
                        c.header
                      )}
                    </th>
                  );
                })}
                {rowActions && <th className="w-12" />}
              </tr>
            </thead>
            <tbody>
              {view.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)}>{empty}</td>
                </tr>
              ) : (
                view.map((r, i) => {
                  const id = getId(r);
                  const on = picked.includes(id);
                  return (
                    <motion.tr
                      key={id}
                      initial={reduce ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out, delay: Math.min(i, 10) * staggerStep.rows } }}
                      onClick={onRowClick ? () => onRowClick(r) : undefined}
                      className={cn("group/row border-b border-border last:border-b-0 transition-colors duration-100", on ? "bg-paper" : "hover:bg-canvas", onRowClick && "cursor-pointer")}
                    >
                      {selectable && (
                        <td className="ps-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={on} onChange={(v) => setPicked(v ? [...picked, id] : picked.filter((x) => x !== id))} label={<span className="sr-only">Sélectionner la ligne</span>} />
                        </td>
                      )}
                      {columns.map((c) => (
                        <td key={c.key} className={cn("px-4", dense ? "h-9" : "h-[2.75em]", c.align === "end" ? "text-end tabular-nums" : "text-start", hide(c))}>
                          {c.cell(r)}
                        </td>
                      ))}
                      {rowActions && (
                        <td className="pe-3 text-end" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 [@media(hover:hover)]:focus-within:opacity-100">{rowActions(r)}</div>
                        </td>
                      )}
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-canvas px-4 py-2 text-xs text-text-secondary">
            <span className="tabular-nums">
              {sorted.length} ligne{sorted.length > 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-3">
              <label className="flex items-center gap-1.5">
                Lignes par page
                <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }} className="rounded border border-border bg-bg px-1 py-0.5">
                  {[10, 25, 50].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <span className="tabular-nums">
                {cur + 1} / {pages}
              </span>
              <IconButton label="Page précédente" size="sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}>
                <ChevronLeft className="size-4" />
              </IconButton>
              <IconButton label="Page suivante" size="sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>
                <ChevronRight className="size-4" />
              </IconButton>
            </span>
          </div>
        )}
      </div>
      {bulk && selectedRows.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="sticky bottom-4 z-20 mx-auto mt-4 flex w-fit items-center gap-4 rounded-lg bg-ink px-4 py-2.5 text-sm text-white shadow-lg">
          <span className="font-medium tabular-nums">{selectedRows.length} sélectionné{selectedRows.length > 1 ? "s" : ""}</span>
          {bulk(selectedRows, () => setPicked([]))}
          <Button variant="inverse" size="sm" onClick={() => setPicked([])}>
            Désélectionner
          </Button>
        </motion.div>
      )}
    </div>
  );
}

/** Saved-view tabs above a table (spec 5.5). */
export function SavedViews<T extends string>({ value, onChange, views }: { value: T; onChange: (v: T) => void; views: Array<{ value: T; label: string; count?: number }> }) {
  return (
    <div role="tablist" aria-label="Vues enregistrées" className="mb-3 flex flex-wrap gap-1.5">
      {views.map((v) => (
        <button key={v.value} role="tab" aria-selected={v.value === value} type="button" onClick={() => onChange(v.value)} className={cn("rounded-full border px-3 py-1 text-sm font-medium transition-colors duration-150 focus-visible:shadow-none focus-visible:ring-2 focus-visible:ring-ink", v.value === value ? "border-ink bg-ink text-white" : "border-border-strong bg-bg text-text-secondary hover:border-ink/40 hover:text-text")}>
          {v.label}
          {v.count !== undefined && <span className={cn("ms-1.5 tabular-nums", v.value === value ? "text-white/70" : "text-text-muted")}>{v.count}</span>}
        </button>
      ))}
    </div>
  );
}

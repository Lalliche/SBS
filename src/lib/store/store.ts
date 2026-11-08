"use client";
/* Tiny external store persisted to localStorage (no backend — showcase prototype). */
import { useSyncExternalStore } from "react";
import { buildSeed, SCENARIO_NOW, STATE_VERSION } from "./seed";
import { advanceTime, archiveIfDue, login, refreshStatuses } from "./actions";
import type { AppState, Scenario } from "./types";

const KEY = "sbs360:state";
const COOKIE = "sbs_persona";

let state: AppState = buildSeed(2);
let hydrated = false;
const listeners = new Set<() => void>();
const hydrationListeners = new Set<() => void>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  listeners.forEach((l) => l());
}
function persist() {
  if (typeof window === "undefined") return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      document.cookie = `${COOKIE}=${state.session.userId ?? ""}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* storage full or unavailable: the prototype keeps working in memory */
    }
  }, 350);
}

export function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.v === STATE_VERSION) state = parsed;
    }
  } catch {
    /* corrupted: fall back to seed */
  }
  window.addEventListener("storage", (e) => {
    // The public client page (iframe / other tab) writes to the same store.
    if (e.key !== KEY || !e.newValue) return;
    try {
      const next = JSON.parse(e.newValue) as AppState;
      if (next.v === STATE_VERSION) {
        state = next;
        emit();
      }
    } catch {
      /* ignore */
    }
  });
  hydrationListeners.forEach((l) => l());
  emit();
}

/** Apply a mutation to a clone of the state, then persist and notify. */
export function act<T = void>(fn: (draft: AppState) => T): T {
  const draft = structuredClone(state);
  const out = fn(draft);
  state = draft;
  persist();
  emit();
  return out;
}

export function getState() {
  return state;
}

export function useApp(): AppState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

export function useHydrated() {
  return useSyncExternalStore(
    (cb) => {
      hydrationListeners.add(cb);
      return () => hydrationListeners.delete(cb);
    },
    () => hydrated,
    () => false,
  );
}

/* Scenario & demo controls */
export function setScenario(n: Scenario) {
  const keep = state.session.userId;
  state = buildSeed(n, keep);
  persist();
  emit();
}
export function resetDemo() {
  setScenario(state.scenario);
}
export function enterAs(userId: string | null) {
  act((s) => login(s, userId));
}
export function travel(days: number | "FIN_DE_CYCLE") {
  return act((s) => advanceTime(s, days));
}
export function syncClock() {
  act((s) => {
    refreshStatuses(s);
    archiveIfDue(s);
  });
}
export { SCENARIO_NOW };

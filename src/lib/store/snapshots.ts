import { competencyStats } from "./engine";
import type { AppState } from "./types";

/** Freeze per-competency averages into every synthesis of a cycle (done at archiving, spec 8). */
export function freezeSnapshots(state: AppState, cycleId: string) {
  for (const s of state.syntheses.filter((x) => x.cycleId === cycleId)) {
    const items = [
      ...state.named.filter((f) => f.cycleId === cycleId && f.recipientId === s.userId && f.status === "ENVOYE"),
      ...state.anonymous.filter((f) => f.cycleId === cycleId && f.recipientId === s.userId),
    ];
    s.snapshot = competencyStats(items, state.competencies);
    if (s.status !== "VALIDEE") s.status = "VALIDEE";
    s.validatedAt = s.validatedAt ?? state.now;
  }
}

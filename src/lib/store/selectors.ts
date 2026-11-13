/* Every figure shown in the UI is computed here from the store (spec hard rule 2). */
import { addDays, average, competencyStats, cycleProgress, quotaProgress, relationLabel } from "./engine";
import { openCycle, feedbackItemsFor } from "./actions";
import type { AnonymousFeedback, AppState, Cycle, FeedbackRequest, NamedFeedback, Relation, User } from "./types";

export const getUser = (s: AppState, id: string | null | undefined) => s.users.find((u) => u.id === id);
export const me = (s: AppState) => getUser(s, s.session.userId);
export const viewedCycle = (s: AppState): Cycle => s.cycles.find((c) => c.id === s.viewingCycleId) ?? openCycle(s);
export const isArchivedView = (s: AppState) => !!s.viewingCycleId && s.cycles.find((c) => c.id === s.viewingCycleId)?.status === "ARCHIVE";
export const departmentOf = (s: AppState, u: User) => s.departments.find((d) => d.id === u.departmentId);
export const directReports = (s: AppState, id: string) => s.users.filter((u) => u.leaderIds.includes(id) && u.status === "ACTIF");

/* Unified view of one received feedback: anonymous ones never carry an author. */
export interface FeedbackView {
  id: string;
  kind: "NOMINATIF" | "ANONYME";
  author?: User; // only for named feedback and only when the rules allow
  authorHidden?: boolean;
  relation: Relation | null;
  missionId: string | null;
  recipientId: string;
  createdAt: string;
  answers: Record<string, string>;
  ratings: Record<string, number>;
  hidden: boolean;
  cycleId: string;
}

function viewOfNamed(s: AppState, f: NamedFeedback): FeedbackView {
  return {
    id: f.id,
    kind: "NOMINATIF",
    author: s.settings.visibility.showAuthorName ? getUser(s, f.authorId) : undefined,
    authorHidden: !s.settings.visibility.showAuthorName,
    relation: f.relation,
    missionId: f.missionId,
    recipientId: f.recipientId,
    createdAt: f.createdAt,
    answers: f.answers,
    ratings: f.ratings,
    hidden: !!f.hiddenByHR,
    cycleId: f.cycleId,
  };
}
function viewOfAnon(s: AppState, f: AnonymousFeedback): FeedbackView {
  return {
    id: f.id,
    kind: "ANONYME",
    relation: s.settings.visibility.showRelationOnAnonymous ? f.relation : null,
    missionId: f.missionId,
    recipientId: f.recipientId,
    createdAt: f.createdAt,
    answers: f.answers,
    ratings: f.ratings,
    hidden: !!f.hiddenByHR,
    cycleId: f.cycleId,
  };
}

/** Feedback about `userId` as a viewer with `viewer`'s rights would see it. */
export function feedbackAbout(s: AppState, userId: string, cycleId: string, viewerId: string): FeedbackView[] {
  const v = s.settings.visibility;
  const viewer = getUser(s, viewerId);
  const target = getUser(s, userId);
  if (!viewer || !target) return [];
  const isSelf = viewerId === userId;
  const isLeader = target.leaderIds.includes(viewerId);
  if (isSelf && !v.seeReceived) return [];
  if (!isSelf && !isLeader && !(viewer.role === "ADMIN_RH" && v.rhSeesIndividual)) return [];
  const named = s.named.filter((f) => f.cycleId === cycleId && f.recipientId === userId && f.status === "ENVOYE").map((f) => viewOfNamed(s, f));
  const anon = s.anonymous.filter((f) => f.cycleId === cycleId && f.recipientId === userId).map((f) => viewOfAnon(s, f));
  const list = [...named, ...(isLeader && !v.leaderSeesAnonymous ? [] : anon)];
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function sentBy(s: AppState, userId: string, cycleId: string): NamedFeedback[] {
  return s.named.filter((f) => f.authorId === userId && f.cycleId === cycleId && f.status === "ENVOYE").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ---------- Quota ---------- */
export function quotaFor(s: AppState, userId: string, cycleId?: string) {
  const user = getUser(s, userId)!;
  const cycle = s.cycles.find((c) => c.id === (cycleId ?? openCycle(s).id)) ?? openCycle(s);
  return quotaProgress({
    user,
    users: s.users.filter((u) => u.status === "ACTIF"),
    named: s.named.filter((f) => f.cycleId === cycle.id),
    anonymous: s.anonymous.filter((f) => f.cycleId === cycle.id),
    rule: cycle.quotaRule,
    tasks: s.tasks,
    anonymousCounts: s.settings.visibility.anonymousCountsInQuota,
    cycleProgress: cycleProgress(cycle.startDate, cycle.endDate, s.now),
  });
}

/* ---------- Requests ---------- */
export function pendingTasks(s: AppState, userId: string) {
  return s.tasks
    .filter((t) => t.giverId === userId && t.status === "EN_ATTENTE")
    .map((t) => ({ task: t, request: s.requests.find((r) => r.id === t.requestId)! }))
    .filter((x) => x.request)
    .sort((a, b) => a.request.dueDate.localeCompare(b.request.dueDate));
}
export function treatedTasks(s: AppState, userId: string) {
  return s.tasks
    .filter((t) => t.giverId === userId && t.status !== "EN_ATTENTE")
    .map((t) => ({ task: t, request: s.requests.find((r) => r.id === t.requestId)! }))
    .filter((x) => x.request);
}
export interface RequestProgress {
  request: FeedbackRequest;
  asked: number;
  answered: number;
  declined: number; // never reveals who
  anonymous: number; // counter only
  namedAnswerers: string[]; // named replies only
  pendingNamedUnknown: number;
}
export function requestProgress(s: AppState, r: FeedbackRequest): RequestProgress {
  const namedReplies = s.named.filter((f) => f.requestId === r.id);
  const anonymous = r.anonymousReplies;
  return {
    request: r,
    asked: r.recipientIds.length,
    answered: namedReplies.length + anonymous,
    declined: 0,
    anonymous,
    namedAnswerers: namedReplies.map((f) => f.authorId),
    pendingNamedUnknown: Math.max(0, r.recipientIds.length - namedReplies.length - anonymous),
  };
}
export const requestsBy = (s: AppState, userId: string) => s.requests.filter((r) => r.requesterId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/* ---------- Competency stats / radar ---------- */
export function statsFor(s: AppState, userId: string, cycleId: string) {
  const items = feedbackItemsFor(s, userId, cycleId);
  const overall = competencyStats(items, s.competencies);
  const by: Record<Relation, ReturnType<typeof competencyStats>> = {
    RESPONSABLE: competencyStats(items, s.competencies, "RESPONSABLE"),
    PAIR: competencyStats(items, s.competencies, "PAIR"),
    EQUIPE: competencyStats(items, s.competencies, "EQUIPE"),
  };
  return { overall, by, count: items.length, missions: new Set(items.map((i) => i.missionId).filter(Boolean)).size };
}
/** Snapshot of an archived/validated cycle (frozen), else live. */
export function snapshotFor(s: AppState, userId: string, cycleId: string) {
  const sy = s.syntheses.find((x) => x.userId === userId && x.cycleId === cycleId);
  if (sy?.snapshot && (sy.status === "VALIDEE" || s.cycles.find((c) => c.id === cycleId)?.status === "ARCHIVE")) return sy.snapshot;
  return statsFor(s, userId, cycleId).overall;
}
export function previousCycle(s: AppState, cycleId: string) {
  const sorted = [...s.cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const i = sorted.findIndex((c) => c.id === cycleId);
  return i > 0 ? sorted[i - 1] : undefined;
}

/* ---------- RH dashboards ---------- */
export function activeUsers(s: AppState) {
  return s.users.filter((u) => u.status === "ACTIF");
}
export function rhKpis(s: AppState) {
  const cycle = openCycle(s);
  const named = s.named.filter((f) => f.cycleId === cycle.id && f.status === "ENVOYE");
  const anon = s.anonymous.filter((f) => f.cycleId === cycle.id);
  const staff = activeUsers(s).filter((u) => u.role !== "ADMIN_TECH");
  // Participation counts named senders + people who answered a request. Spontaneous anonymous sends
  // cannot be attributed (by design), so they are not included.
  const givers = new Set<string>([...named.map((f) => f.authorId), ...s.tasks.filter((t) => t.status === "TRAITEE").map((t) => t.giverId)]);
  const reached = staff.filter((u) => quotaFor(s, u.id, cycle.id).reached).length;
  const syn = s.syntheses.filter((x) => x.cycleId === cycle.id);
  return {
    total: named.length + anon.length,
    named: named.length,
    anonymous: anon.length,
    participation: staff.length ? givers.size / staff.length : 0,
    participants: givers.size,
    staff: staff.length,
    reached,
    validated: syn.filter((x) => x.status === "VALIDEE").length,
    synthesesTotal: syn.length,
    underQuota: staff.filter((u) => !quotaFor(s, u.id, cycle.id).reached).length,
  };
}
/** Weekly buckets (named vs anonymous) between cycle start and now. */
export function feedbackSeries(s: AppState, cycleId: string, buckets = 12) {
  const cycle = s.cycles.find((c) => c.id === cycleId) ?? openCycle(s);
  const start = new Date(cycle.startDate).getTime();
  const end = Math.min(new Date(s.now).getTime(), new Date(cycle.endDate).getTime());
  const span = Math.max(1, end - start);
  const out = Array.from({ length: buckets }, (_, i) => ({ label: "", named: 0, anonymous: 0, from: start + (span * i) / buckets }));
  const idx = (t: number) => Math.min(buckets - 1, Math.max(0, Math.floor(((t - start) / span) * buckets)));
  s.named.filter((f) => f.cycleId === cycle.id).forEach((f) => out[idx(new Date(f.createdAt).getTime())].named++);
  s.anonymous.filter((f) => f.cycleId === cycle.id).forEach((f) => out[idx(new Date(f.createdAt).getTime())].anonymous++);
  const M = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  out.forEach((o) => {
    const d = new Date(o.from);
    o.label = `${d.getUTCDate()} ${M[d.getUTCMonth()]}`;
  });
  return out;
}
export function participationByDepartment(s: AppState) {
  const cycle = openCycle(s);
  return s.departments
    .map((d) => {
      const people = activeUsers(s).filter((u) => u.departmentId === d.id && u.role !== "ADMIN_TECH");
      const reached = people.filter((u) => quotaFor(s, u.id, cycle.id).reached).length;
      const received = people.reduce((n, u) => n + quotaFor(s, u.id, cycle.id).received, 0);
      return { department: d, people: people.length, reached, received, ratio: people.length ? reached / people.length : 0 };
    })
    .filter((x) => x.people > 0);
}

export function teamQuotaRows(s: AppState, leaderId: string) {
  const cycle = openCycle(s);
  return directReports(s, leaderId).map((u) => {
    const q = quotaFor(s, u.id, cycle.id);
    const items = [...s.named.filter((f) => f.cycleId === cycle.id && f.recipientId === u.id && f.status === "ENVOYE"), ...s.anonymous.filter((f) => f.cycleId === cycle.id && f.recipientId === u.id)];
    const last = items.map((i) => i.createdAt).sort().pop();
    const missions = s.missions.filter((m) => m.participantIds.includes(u.id) && m.cycleId === cycle.id).length;
    const sy = s.syntheses.find((x) => x.userId === u.id && x.cycleId === cycle.id);
    return { user: u, quota: q, last, missions, synthesis: sy?.status ?? ("NON_COMMENCEE" as const) };
  });
}

export function missionFeedbackCount(s: AppState, missionId: string) {
  return s.named.filter((f) => f.missionId === missionId && f.status === "ENVOYE").length + s.anonymous.filter((f) => f.missionId === missionId).length;
}
export const missionsOf = (s: AppState, userId: string, cycleId?: string) => s.missions.filter((m) => (cycleId ? m.cycleId === cycleId : true) && (m.participantIds.includes(userId) || m.leadId === userId));
export const unreadFor = (s: AppState, userId: string) => s.notifications.filter((n) => n.userId === userId && !n.read).length;
export const notificationsFor = (s: AppState, userId: string) => s.notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

/** Missions finished with no feedback requested by the user (home nudge). */
export function finishedWithoutRequest(s: AppState, userId: string) {
  return s.missions.filter((m) => m.status === "TERMINEE" && m.participantIds.includes(userId) && !s.requests.some((r) => r.missionId === m.id && r.requesterId === userId));
}

export function synthesesToWrite(s: AppState, leaderId: string) {
  const cycle = openCycle(s);
  return directReports(s, leaderId).filter((u) => {
    const sy = s.syntheses.find((x) => x.userId === u.id && x.cycleId === cycle.id);
    return !sy || sy.status !== "VALIDEE";
  });
}

export function relationChip(rel: Relation | null) {
  return rel ? relationLabel[rel] : null;
}
export const _deps = { addDays, average };

/** Client links a user may see: those they created, those on missions they lead, and (per rules Q7 / Q8) on missions they take part in. */
export function visibleClientLinks(s: AppState, userId: string) {
  const v = s.settings.visibility;
  return s.clientLinks.filter((l) => {
    const m = s.missions.find((x) => x.id === l.missionId);
    if (l.createdById === userId || m?.leadId === userId) return true;
    return !!m?.participantIds.includes(userId) && (v.seeClientFeedback || v.participantsSeeClient);
  });
}

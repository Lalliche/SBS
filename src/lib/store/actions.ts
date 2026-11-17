/* All state mutations. Each action mutates a *draft* AppState (the store clones before calling).
   ANONYMITY: `giveAnonymous` receives no author id (spec 7.2.1). */
import { addDays, competencyStats, daysBetween, fmtDate, fullName, relDate, relationOf, roundToDay, average } from "./engine";
import { freezeSnapshots } from "./snapshots";
import { AXIS_TEXT, STRENGTH_TEXT } from "./texts";
import { hashString, makeAnswers, makeRatings, mulberry32, pick, profileForUser } from "./seed";
import type {
  AdminCategory,
  AiSuggestion,
  AnonymousFeedback,
  AppState,
  ClientLink,
  Draft,
  Mission,
  NamedFeedback,
  NotificationKind,
  Relation,
  Role,
  Synthesis,
  User,
} from "./types";

let counter = 0;
const nid = (p: string, s: AppState) => `${p}-${hashString(s.now + (counter++).toString(36)).toString(36)}${counter.toString(36)}`;

export function openCycle(s: AppState) {
  return s.cycles.find((c) => c.status === "OUVERT") ?? s.cycles[s.cycles.length - 1];
}
export const userOf = (s: AppState, id: string | null | undefined) => s.users.find((u) => u.id === id);

/* ---------- Logging & notifications ---------- */
export function logAdmin(s: AppState, actorId: string | null, category: AdminCategory, action: string, target: string, details?: { before?: string; after?: string }) {
  s.adminEvents.unshift({ id: nid("ev", s), ts: s.now, actorId, category, action, target, details });
}
export function notify(s: AppState, userId: string, kind: NotificationKind, title: string, body: string, href: string) {
  const u = userOf(s, userId);
  if (!u) return;
  s.notifications.unshift({ id: nid("nt", s), userId, kind, title, body, href, createdAt: s.now, read: false });
}
const notifyRole = (s: AppState, role: Role, kind: NotificationKind, title: string, body: string, href: string) =>
  s.users.filter((u) => u.role === role && u.status === "ACTIF").forEach((u) => notify(s, u.id, kind, title, body, href));

/* ---------- Session ---------- */
export const login = (s: AppState, userId: string | null) => {
  s.session.userId = userId;
  s.viewingCycleId = null;
};

/* ---------- Drafts (autosave) ---------- */
export const emptyDraft = (): Draft => ({ recipientId: null, missionId: null, requestId: null, type: null, answers: {}, ratings: {}, savedAt: null, step: 0 });
export function saveDraft(s: AppState, userId: string, draft: Draft) {
  s.drafts[userId] = { ...draft, savedAt: s.now };
}
export function clearDraft(s: AppState, userId: string) {
  delete s.drafts[userId];
}

/* ---------- Feedback: two separate write paths ---------- */
export interface NamedPayload {
  authorId: string;
  recipientId: string;
  missionId: string | null;
  relation: Relation;
  requestId?: string;
  answers: Record<string, string>;
  ratings: Record<string, number>;
}
export interface AnonymousPayload {
  // NOTE: no author, no request id, no giver reference. Ever.
  recipientId: string;
  missionId: string | null;
  relation: Relation | null;
  answers: Record<string, string>;
  ratings: Record<string, number>;
}

function afterReceive(s: AppState, recipientId: string, missionId: string | null) {
  const mission = s.missions.find((m) => m.id === missionId);
  const recipient = userOf(s, recipientId);
  notify(s, recipientId, "FEEDBACK", "Vous avez reçu un feedback", mission ? `Un feedback sur « ${mission.name} » est disponible.` : "Un nouveau feedback est disponible.", "/app/feedbacks");
  for (const leaderId of recipient?.leaderIds ?? []) {
    notify(s, leaderId, "FEEDBACK", "Nouveau feedback sur votre équipe", `Un feedback concernant ${recipient ? fullName(recipient) : "un collaborateur"} a été reçu.`, `/app/equipe/${recipientId}`);
  }
}

export function giveNamed(s: AppState, p: NamedPayload) {
  const cycle = openCycle(s);
  const fb: NamedFeedback = {
    id: nid("fn", s),
    cycleId: cycle.id,
    missionId: p.missionId,
    authorId: p.authorId,
    recipientId: p.recipientId,
    relation: p.relation,
    requestId: p.requestId,
    answers: p.answers,
    ratings: p.ratings,
    createdAt: s.now,
    status: "ENVOYE",
  };
  s.named.push(fb);
  if (p.requestId) {
    const t = s.tasks.find((x) => x.giverId === p.authorId && x.requestId === p.requestId);
    if (t) t.status = "TRAITEE";
  }
  afterReceive(s, p.recipientId, p.missionId);
  return fb.id;
}

export function giveAnonymous(s: AppState, p: AnonymousPayload) {
  const cycle = openCycle(s);
  const fb: AnonymousFeedback = {
    id: nid("fa", s),
    cycleId: cycle.id,
    missionId: p.missionId,
    recipientId: p.recipientId,
    relation: s.settings.visibility.showRelationOnAnonymous ? p.relation : null,
    answers: p.answers,
    ratings: p.ratings,
    createdAt: roundToDay(s.now), // rounded to the day to limit correlation
  };
  s.anonymous.push(fb);
  logAdmin(s, null, "Feedbacks", "Un feedback anonyme a été envoyé", "—");
  afterReceive(s, p.recipientId, p.missionId);
  return fb.id;
}

/** Called separately from `giveAnonymous`: marks the giver's task and bumps the request's anonymous counter. */
export function completeTaskAnonymously(s: AppState, giverId: string, requestId: string) {
  const t = s.tasks.find((x) => x.giverId === giverId && x.requestId === requestId);
  if (t) t.status = "TRAITEE";
  const r = s.requests.find((x) => x.id === requestId);
  if (r) r.anonymousReplies += 1;
}

export function hideFeedback(s: AppState, actorId: string, id: string, hidden: boolean) {
  const f = s.anonymous.find((x) => x.id === id);
  if (!f) return;
  f.hiddenByHR = hidden;
  logAdmin(s, actorId, "Feedbacks", hidden ? "Texte anonyme masqué" : "Texte anonyme rétabli", `Feedback pour ${fullName(userOf(s, f.recipientId)!)}`);
}

/* ---------- Requests ---------- */
export function createRequest(s: AppState, requesterId: string, input: { missionId: string | null; role?: string; hours?: number; recipientIds: string[]; message: string; dueDate: string; allowAnonymous: boolean }) {
  const cycle = openCycle(s);
  const mission = s.missions.find((m) => m.id === input.missionId);
  const id = nid("rq", s);
  s.requests.push({ id, cycleId: cycle.id, missionId: input.missionId, role: input.role?.trim() || undefined, hours: input.hours && input.hours > 0 ? input.hours : undefined, requesterId, recipientIds: input.recipientIds, message: input.message, createdAt: s.now, dueDate: input.dueDate, allowAnonymous: input.allowAnonymous, anonymousReplies: 0 });
  const requester = userOf(s, requesterId)!;
  for (const r of input.recipientIds) {
    s.tasks.push({ id: nid("tk", s), giverId: r, requestId: id, status: "EN_ATTENTE" });
    notify(s, r, "DEMANDE", "Nouvelle demande de feedback", `${fullName(requester)} vous demande un feedback${mission ? ` sur « ${mission.name} »` : ""}. Elle vous est aussi envoyée par e-mail.`, "/app/demandes");
  }
  // CDC 3.5: the request is nominative and also reaches the recipient by e-mail.
  s.emailSends.unshift({ id: nid("es", s), ts: s.now, templateId: "t-demande", recipients: input.recipientIds.length, delivered: input.recipientIds.length, opened: 0, audience: `Demande de ${fullName(requester)}` });
  return id;
}
export function declineTask(s: AppState, giverId: string, requestId: string, reason?: string) {
  const t = s.tasks.find((x) => x.giverId === giverId && x.requestId === requestId);
  if (!t) return;
  t.status = "DECLINEE";
  t.reason = reason;
  const r = s.requests.find((x) => x.id === requestId);
  if (r) notify(s, r.requesterId, "DEMANDE", "Une demande a été déclinée", "Une personne sollicitée ne peut pas répondre à votre demande.", "/app/demandes");
}
/**
 * Post-contract change: the evaluator sends the request back (wrong person, or the request is
 * badly filled). Unlike a decline, the requester is told who and why, and can correct and resend.
 */
export function returnTask(s: AppState, giverId: string, requestId: string, reason: string) {
  const t = s.tasks.find((x) => x.giverId === giverId && x.requestId === requestId && x.status === "EN_ATTENTE");
  const r = s.requests.find((x) => x.id === requestId);
  if (!t || !r) return;
  t.status = "RETOURNEE";
  t.reason = reason.trim();
  const giver = userOf(s, giverId);
  notify(s, r.requesterId, "DEMANDE", "Une demande vous a été retournée", `${giver ? fullName(giver) : "Une personne"} vous la retourne : « ${t.reason} ». Corrigez-la puis renvoyez-la.`, "/app/demandes?tab=envoyees");
}
/** The requester fixes a returned request (role, message) and sends it again to the same person. */
export function resendTask(s: AppState, requesterId: string, requestId: string, giverId: string, patch: { role?: string; message?: string }) {
  const r = s.requests.find((x) => x.id === requestId && x.requesterId === requesterId);
  const t = s.tasks.find((x) => x.giverId === giverId && x.requestId === requestId && x.status === "RETOURNEE");
  if (!r || !t) return;
  if (patch.role !== undefined) r.role = patch.role.trim() || undefined;
  if (patch.message !== undefined) r.message = patch.message.trim();
  t.status = "EN_ATTENTE";
  t.reason = undefined;
  const requester = userOf(s, requesterId);
  notify(s, giverId, "DEMANDE", "Demande de feedback corrigée", `${requester ? fullName(requester) : "Le demandeur"} a corrigé sa demande et vous la renvoie.`, "/app/demandes");
}
export function remindRequest(s: AppState, requestId: string) {
  const r = s.requests.find((x) => x.id === requestId);
  if (!r) return 0;
  const pending = s.tasks.filter((t) => t.requestId === requestId && t.status === "EN_ATTENTE");
  const mission = s.missions.find((m) => m.id === r.missionId);
  pending.forEach((t) => notify(s, t.giverId, "RAPPEL", "Rappel : un feedback vous attend", `Demande${mission ? ` sur « ${mission.name} »` : ""}, à traiter avant le ${fmtDate(r.dueDate)}.`, "/app/demandes"));
  return pending.length;
}
export function addRecipientsToRequest(s: AppState, requestId: string, ids: string[]) {
  const r = s.requests.find((x) => x.id === requestId);
  if (!r) return;
  const requester = userOf(s, r.requesterId)!;
  const mission = s.missions.find((m) => m.id === r.missionId);
  for (const id of ids) {
    if (r.recipientIds.includes(id)) continue;
    r.recipientIds.push(id);
    s.tasks.push({ id: nid("tk", s), giverId: id, requestId, status: "EN_ATTENTE" });
    notify(s, id, "DEMANDE", "Nouvelle demande de feedback", `${fullName(requester)} vous demande un feedback${mission ? ` sur « ${mission.name} »` : ""}.`, "/app/demandes");
  }
}

/* ---------- Notifications ---------- */
export const markRead = (s: AppState, id: string) => {
  const n = s.notifications.find((x) => x.id === id);
  if (n) n.read = true;
};
export const markAllRead = (s: AppState, userId: string) => s.notifications.filter((n) => n.userId === userId).forEach((n) => (n.read = true));

/* ---------- Missions ---------- */
export function createMission(s: AppState, actorId: string, m: Omit<Mission, "id" | "cycleId" | "status">) {
  const cycle = openCycle(s);
  const mission: Mission = { ...m, id: nid("m", s), cycleId: cycle.id, status: "EN_COURS" };
  s.missions.push(mission);
  logAdmin(s, actorId, "Missions", "Mission créée", m.name);
  m.participantIds.forEach((p) => p !== actorId && notify(s, p, "SYSTEME", "Vous participez à une nouvelle mission", `« ${m.name} » a été créée.`, `/app/missions/${mission.id}`));
  return mission.id;
}
export function updateMission(s: AppState, actorId: string, id: string, patch: Partial<Pick<Mission, "name" | "description" | "startDate" | "endDate" | "leadId">>) {
  const m = s.missions.find((x) => x.id === id);
  if (!m) return;
  Object.assign(m, patch);
  logAdmin(s, actorId, "Missions", "Mission modifiée", m.name);
}
export function completeMission(s: AppState, actorId: string, id: string) {
  const m = s.missions.find((x) => x.id === id);
  if (!m) return;
  m.status = "TERMINEE";
  logAdmin(s, actorId, "Missions", "Mission marquée comme terminée", m.name);
}
export function setParticipants(s: AppState, id: string, ids: string[]) {
  const m = s.missions.find((x) => x.id === id);
  if (m) m.participantIds = ids;
}

/* ---------- Synthesis ---------- */
export function ensureSynthesis(s: AppState, userId: string, cycleId: string): Synthesis {
  let sy = s.syntheses.find((x) => x.userId === userId && x.cycleId === cycleId);
  if (!sy) {
    sy = { id: nid("sy", s), cycleId, userId, status: "NON_COMMENCEE", strengths: [], axes: [], aiSuggestions: [] };
    s.syntheses.push(sy);
  }
  return sy;
}
function touchSynthesis(sy: Synthesis) {
  if (sy.status === "NON_COMMENCEE") sy.status = "EN_REDACTION";
}
export function addSynthesisItem(s: AppState, userId: string, cycleId: string, kind: "strengths" | "axes", competencyId: string, text: string, fromAi = false) {
  const sy = ensureSynthesis(s, userId, cycleId);
  if (sy.status === "VALIDEE") return;
  sy[kind].push({ id: nid("si", s), competencyId, text, fromAi });
  touchSynthesis(sy);
}
export function updateSynthesisItem(s: AppState, userId: string, cycleId: string, kind: "strengths" | "axes", itemId: string, patch: { text?: string; competencyId?: string }) {
  const sy = ensureSynthesis(s, userId, cycleId);
  if (sy.status === "VALIDEE") return;
  const it = sy[kind].find((i) => i.id === itemId);
  if (it) Object.assign(it, patch);
  touchSynthesis(sy);
}
export function removeSynthesisItem(s: AppState, userId: string, cycleId: string, kind: "strengths" | "axes", itemId: string) {
  const sy = ensureSynthesis(s, userId, cycleId);
  if (sy.status === "VALIDEE") return;
  sy[kind] = sy[kind].filter((i) => i.id !== itemId);
}
export function restoreSynthesisItem(s: AppState, userId: string, cycleId: string, kind: "strengths" | "axes", item: Synthesis["strengths"][number], index: number) {
  const sy = ensureSynthesis(s, userId, cycleId);
  sy[kind].splice(Math.min(index, sy[kind].length), 0, item);
}
export function moveSynthesisItem(s: AppState, userId: string, cycleId: string, kind: "strengths" | "axes", itemId: string, dir: -1 | 1) {
  const sy = ensureSynthesis(s, userId, cycleId);
  if (sy.status === "VALIDEE") return;
  const list = sy[kind];
  const i = list.findIndex((x) => x.id === itemId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
}

export function feedbackItemsFor(s: AppState, userId: string, cycleId: string) {
  return [
    ...s.named.filter((f) => f.cycleId === cycleId && f.recipientId === userId && f.status === "ENVOYE" && !f.hiddenByHR),
    ...s.anonymous.filter((f) => f.cycleId === cycleId && f.recipientId === userId),
  ];
}

export function generateAiSuggestions(s: AppState, userId: string, cycleId: string) {
  const sy = ensureSynthesis(s, userId, cycleId);
  const items = feedbackItemsFor(s, userId, cycleId);
  const stats = competencyStats(items, s.competencies).filter((c) => c.average !== null);
  const missions = new Set(items.map((i) => i.missionId).filter(Boolean)).size;
  const sorted = [...stats].sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
  const out: AiSuggestion[] = [];
  const mk = (kind: "STRENGTH" | "AXIS", c: (typeof stats)[number]) => {
    const comp = s.competencies.find((x) => x.id === c.competencyId)!;
    out.push({
      id: nid("ai", s),
      competencyId: c.competencyId,
      kind,
      summary: kind === "STRENGTH" ? `Plusieurs retours convergent sur un point fort en « ${comp.name} » (moyenne ${c.average!.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} / 5).` : `Les retours identifient une marge de progression en « ${comp.name} » (moyenne ${c.average!.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} / 5).`,
      suggestion: kind === "STRENGTH" ? STRENGTH_TEXT[comp.id][0] : AXIS_TEXT[comp.id][0],
      basedOn: { responses: items.length, missions },
      status: "PENDING",
    });
  };
  sorted.slice(0, 2).forEach((c) => mk("STRENGTH", c));
  sorted.slice(-2).reverse().forEach((c) => mk("AXIS", c));
  sy.aiSuggestions = out;
  touchSynthesis(sy);
  return out.length;
}
export function applyAiSuggestion(s: AppState, userId: string, cycleId: string, id: string, text?: string) {
  const sy = ensureSynthesis(s, userId, cycleId);
  const sg = sy.aiSuggestions.find((x) => x.id === id);
  if (!sg || sy.status === "VALIDEE") return;
  sg.status = "USED";
  addSynthesisItem(s, userId, cycleId, sg.kind === "STRENGTH" ? "strengths" : "axes", sg.competencyId, text ?? sg.suggestion, true);
}
export function ignoreAiSuggestion(s: AppState, userId: string, cycleId: string, id: string) {
  const sg = ensureSynthesis(s, userId, cycleId).aiSuggestions.find((x) => x.id === id);
  if (sg) sg.status = "IGNORED";
}
export function rateAiSuggestion(s: AppState, userId: string, cycleId: string, id: string, helpful: boolean) {
  const sg = ensureSynthesis(s, userId, cycleId).aiSuggestions.find((x) => x.id === id);
  if (sg) sg.helpful = helpful;
}
export function synthesisChecklist(sy: Synthesis) {
  return {
    strengths: sy.strengths.length > 0,
    axes: sy.axes.length > 0,
    ai: sy.aiSuggestions.every((x) => x.status !== "PENDING"),
  };
}
export function validateSynthesis(s: AppState, userId: string, cycleId: string, actorId: string) {
  const sy = ensureSynthesis(s, userId, cycleId);
  const items = feedbackItemsFor(s, userId, cycleId);
  sy.snapshot = competencyStats(items, s.competencies);
  sy.status = "VALIDEE";
  sy.validatedAt = s.now;
  const u = userOf(s, userId)!;
  if (s.settings.visibility.seeOwnSynthesis) notify(s, userId, "SYNTHESE", "Votre synthèse est disponible", "Elle a été validée par votre responsable.", "/app/syntheses");
  logAdmin(s, actorId, "Cycles", "Synthèse validée", fullName(u));
}
export function reopenSynthesis(s: AppState, userId: string, cycleId: string) {
  const sy = ensureSynthesis(s, userId, cycleId);
  sy.status = "EN_REDACTION";
  sy.validatedAt = undefined;
}

/* ---------- Cycles & time ---------- */
export function createCycle(s: AppState, actorId: string, name: string, startDate: string, endDate: string) {
  const rules = openCycle(s)?.reminderRules.map((r) => ({ ...r, lastRun: null })) ?? [];
  const id = nid("cy", s);
  s.cycles.push({ id, name, startDate, endDate, status: new Date(startDate) > new Date(s.now) ? "A_VENIR" : "OUVERT", quotaRule: { ...s.settings.quotas }, reminderRules: rules, aiMode: "MANUEL" });
  logAdmin(s, actorId, "Cycles", "Cycle créé", name);
  return id;
}
export function setQuota(s: AppState, actorId: string, cycleId: string, patch: Partial<AppState["settings"]["quotas"]>) {
  const c = s.cycles.find((x) => x.id === cycleId);
  if (!c) return;
  const before = JSON.stringify(c.quotaRule);
  c.quotaRule = { ...c.quotaRule, ...patch };
  s.settings.quotas = c.quotaRule;
  logAdmin(s, actorId, "Cycles", "Objectifs modifiés", c.name, { before, after: JSON.stringify(c.quotaRule) });
}
export function toggleReminderRule(s: AppState, actorId: string, cycleId: string, ruleId: string, enabled: boolean) {
  const r = s.cycles.find((c) => c.id === cycleId)?.reminderRules.find((x) => x.id === ruleId);
  if (!r) return;
  r.enabled = enabled;
  logAdmin(s, actorId, "Cycles", enabled ? "Règle de rappel activée" : "Règle de rappel désactivée", r.label);
}
export function addReminderRule(s: AppState, actorId: string, cycleId: string, kind: "DEMANDES_EN_ATTENTE" | "ECART_OBJECTIF" | "FIN_DE_CYCLE", cadence: "HEBDOMADAIRE" | "MENSUEL" | "J_MOINS_30", label: string) {
  const c = s.cycles.find((x) => x.id === cycleId);
  if (!c) return;
  c.reminderRules.push({ id: nid("rr", s), label, kind, cadence, enabled: true, lastRun: null });
  logAdmin(s, actorId, "Cycles", "Règle de rappel ajoutée", label);
}
export function setAiMode(s: AppState, actorId: string, mode: "OFF" | "MANUEL" | "ASSISTE") {
  const c = openCycle(s);
  const before = c.aiMode;
  c.aiMode = mode;
  logAdmin(s, actorId, "Paramètres", "Mode IA modifié", c.name, { before, after: mode });
}

export function sendReminders(s: AppState, actorId: string | null, audience: "OBJECTIF" | "DEMANDES" | "RESPONSABLES", templateId: string, recipientIds: string[]) {
  const tpl = s.templates.find((t) => t.id === templateId);
  recipientIds.forEach((id) => notify(s, id, "RAPPEL", tpl?.subject.replace(/\{\{[^}]+\}\}/g, "…") ?? "Rappel", tpl?.body.split("\n")[2] ?? "Vous avez un rappel.", audience === "OBJECTIF" ? "/app/accueil" : "/app/demandes"));
  const n = recipientIds.length;
  s.emailSends.unshift({ id: nid("es", s), ts: s.now, templateId, recipients: n, delivered: n, opened: Math.round(n * 0.6), audience: audience === "OBJECTIF" ? "Collaborateurs sous l’objectif" : audience === "DEMANDES" ? "Demandes en attente" : "Responsables d’équipe" });
  logAdmin(s, actorId, "Cycles", "Rappel envoyé", `${tpl?.name ?? "Rappel"} — ${n} destinataires`);
  return n;
}

/** Simulate plausible feedback, mixed named/anonymous, so counters move live. */
export function simulateFeedbacks(s: AppState, n: number) {
  const cycle = openCycle(s);
  const rng = mulberry32(hashString(s.now + s.named.length + s.anonymous.length + n));
  const ms = s.missions.filter((m) => m.status === "EN_COURS" && m.cycleId === cycle.id);
  if (!ms.length) return 0;
  let made = 0;
  for (let i = 0; i < n; i++) {
    const m = pick(rng, ms);
    const pool = m.participantIds.filter((id) => userOf(s, id)?.status === "ACTIF");
    if (pool.length < 2) continue;
    const a = pick(rng, pool);
    let b = pick(rng, pool);
    let guard = 0;
    while (b === a && guard++ < 8) b = pick(rng, pool);
    if (a === b) continue;
    const author = userOf(s, a)!;
    const recipient = userOf(s, b)!;
    const profile = profileForUser(b);
    const answers = makeAnswers(rng, profile, m.name);
    const ratings = makeRatings(rng, profile, rng() < 0.7);
    const relation = relationOf(author, recipient) ?? "PAIR";
    if (rng() < 0.25) giveAnonymous(s, { recipientId: b, missionId: m.id, relation, answers, ratings });
    else giveNamed(s, { authorId: a, recipientId: b, missionId: m.id, relation, answers, ratings });
    made++;
  }
  return made;
}

function runReminders(s: AppState) {
  const cycle = openCycle(s);
  if (cycle.status !== "OUVERT") return;
  for (const r of cycle.reminderRules.filter((x) => x.enabled)) {
    const every = r.cadence === "HEBDOMADAIRE" ? 7 : r.cadence === "MENSUEL" ? 30 : 9999;
    if (r.cadence === "J_MOINS_30") {
      if (!r.lastRun && daysBetween(s.now, cycle.endDate) <= 30) {
        r.lastRun = s.now;
        s.users.filter((u) => u.status === "ACTIF").forEach((u) => notify(s, u.id, "RAPPEL", "Le cycle se termine bientôt", `Le cycle ${cycle.name} se termine le ${fmtDate(cycle.endDate)}.`, "/app/accueil"));
        s.emailSends.unshift({ id: nid("es", s), ts: s.now, templateId: "t-fin-cycle", recipients: s.users.length, delivered: s.users.length, opened: Math.round(s.users.length * 0.55), audience: "Tous les collaborateurs" });
      }
      continue;
    }
    if (r.lastRun && daysBetween(r.lastRun, s.now) < every) continue;
    r.lastRun = s.now;
    if (r.kind === "DEMANDES_EN_ATTENTE") {
      const givers = new Set(s.tasks.filter((t) => t.status === "EN_ATTENTE").map((t) => t.giverId));
      givers.forEach((g) => notify(s, g, "RAPPEL", "Vous avez des demandes en attente", "Pensez à répondre aux demandes de feedback de vos collègues.", "/app/demandes"));
      if (givers.size) s.emailSends.unshift({ id: nid("es", s), ts: s.now, templateId: "t-rappel-demande", recipients: givers.size, delivered: givers.size, opened: Math.round(givers.size * 0.7), audience: "Demandes en attente" });
    }
  }
}

export function refreshStatuses(s: AppState) {
  for (const m of s.missions) m.status = new Date(m.endDate) < new Date(s.now) ? "TERMINEE" : "EN_COURS";
  for (const l of s.clientLinks) if (l.status === "ACTIF" && new Date(l.expiresAt) <= new Date(s.now)) l.status = "EXPIRE";
}

/** Automatic archiving when `now > cycle.endDate` (spec 8). Returns true if a cycle was archived. */
export function archiveIfDue(s: AppState) {
  const cycle = s.cycles.find((c) => c.status === "OUVERT");
  if (!cycle || new Date(s.now) <= new Date(cycle.endDate)) return false;
  freezeSnapshots(s, cycle.id);
  cycle.status = "ARCHIVE";
  const y = new Date(cycle.endDate).getUTCFullYear();
  const next = s.cycles.find((c) => c.status === "A_VENIR");
  if (next) next.status = "OUVERT";
  else {
    const nm = `FY${String(y + 1).slice(2)}`;
    s.cycles.push({
      id: nid("cy", s),
      name: nm,
      startDate: `${y}-07-01T00:00:00.000Z`,
      endDate: `${y + 1}-06-30T23:59:59.000Z`,
      status: "OUVERT",
      quotaRule: { ...cycle.quotaRule },
      reminderRules: cycle.reminderRules.map((r) => ({ ...r, lastRun: null })),
      aiMode: cycle.aiMode,
    });
  }
  const label = `${cycle.name} archivé`;
  notifyRole(s, "ADMIN_RH", "SYSTEME", label, "Le nouveau cycle est ouvert. Les synthèses du cycle précédent sont en lecture seule.", "/app/cycles");
  s.users.filter((u) => u.role === "RESPONSABLE").forEach((u) => notify(s, u.id, "SYNTHESE", label, "Les synthèses de votre équipe sont consultables en lecture seule.", "/app/syntheses"));
  logAdmin(s, null, "Cycles", "Cycle archivé automatiquement", cycle.name);
  return true;
}

export function advanceTime(s: AppState, days: number | "FIN_DE_CYCLE") {
  const cycle = openCycle(s);
  const target = days === "FIN_DE_CYCLE" ? Math.max(1, daysBetween(s.now, cycle.endDate) + 1) : days;
  const step = Math.min(target, 60);
  // Walk day by day in coarse steps so reminders/archiving fire at the right moments.
  let left = target;
  let archived = false;
  while (left > 0) {
    const d = Math.min(left, 7);
    s.now = addDays(s.now, d);
    left -= d;
    refreshStatuses(s);
    runReminders(s);
    if (archiveIfDue(s)) archived = true;
  }
  if (!archived) simulateFeedbacks(s, Math.min(40, Math.round(step * 0.9)));
  return archived;
}

/* ---------- Client links (one link per client) ---------- */
export interface ClientLinkInput {
  missionId: string;
  clientName: string;
  company: string;
  clientEmail: string;
  title: string;
  welcome: string;
  questionIds: string[];
  expiresAt: string;
  maxResponses: number;
  active: boolean;
}
export function createClientLink(s: AppState, actorId: string, l: ClientLinkInput) {
  const { active, ...rest } = l;
  const slug = (s.missions.find((m) => m.id === l.missionId)?.name ?? "mission").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "").slice(0, 6);
  const token = `${slug}-${hashString(s.now + l.clientEmail + s.clientLinks.length).toString(36).slice(0, 4)}`;
  const link: ClientLink = { ...rest, id: nid("cl", s), token, createdById: actorId, createdAt: s.now, status: active ? "ACTIF" : "DESACTIVE" };
  s.clientLinks.push(link);
  logAdmin(s, actorId, "Liens client", "Lien client créé", `${link.clientName} · ${link.company}`);
  return link;
}
export function setLinkStatus(s: AppState, actorId: string, id: string, status: "ACTIF" | "DESACTIVE") {
  const l = s.clientLinks.find((x) => x.id === id);
  if (!l) return;
  l.status = status;
  if (status === "ACTIF" && new Date(l.expiresAt) <= new Date(s.now)) l.expiresAt = addDays(s.now, 14);
  logAdmin(s, actorId, "Liens client", status === "ACTIF" ? "Lien client réactivé" : "Lien client désactivé", l.clientName);
}
export function extendLink(s: AppState, actorId: string, id: string, days: number) {
  const l = s.clientLinks.find((x) => x.id === id);
  if (!l) return;
  l.expiresAt = addDays(new Date(l.expiresAt) > new Date(s.now) ? l.expiresAt : s.now, days);
  if (l.status === "EXPIRE") l.status = "ACTIF";
  logAdmin(s, actorId, "Liens client", "Lien client prolongé", l.clientName);
}
/** Reminder e-mail to the client who has not answered yet (CDC 3.7 « relance du client »). */
export function remindClient(s: AppState, actorId: string, id: string) {
  const l = s.clientLinks.find((x) => x.id === id);
  if (!l) return;
  s.emailSends.unshift({ id: nid("es", s), ts: s.now, templateId: "t-client", recipients: 1, delivered: 1, opened: 0, audience: `Relance client — ${l.clientName}` });
  logAdmin(s, actorId, "Liens client", "Client relancé", l.clientName);
}
export function sendClientLinkEmail(s: AppState, actorId: string, id: string, to: string[]) {
  const l = s.clientLinks.find((x) => x.id === id);
  if (!l) return;
  s.emailSends.unshift({ id: nid("es", s), ts: s.now, templateId: "t-client", recipients: to.length, delivered: to.length, opened: 0, audience: `Lien client — ${l.clientName}` });
}
/** The client is identified by the link itself: no identification input (CDC 3.7). Returns false if the link cannot take an answer. */
export function submitClientResponse(s: AppState, token: string, input: { answers: Record<string, string>; rating?: number }) {
  const l = s.clientLinks.find((x) => x.token === token);
  if (!l) return false;
  if (s.clientResponses.filter((r) => r.linkId === l.id).length >= l.maxResponses) return false;
  s.clientResponses.push({ id: nid("cr", s), linkId: l.id, missionId: l.missionId, clientName: l.clientName, company: l.company, answers: input.answers, rating: input.rating, createdAt: s.now });
  s.clientDevices.push(l.id);
  const mission = s.missions.find((m) => m.id === l.missionId);
  const title = "Retour client reçu";
  const body = `${l.clientName} (${l.company}) a répondu pour « ${mission?.name ?? l.title} ».`;
  const targets = new Set([l.createdById, mission?.leadId].filter(Boolean) as string[]);
  targets.forEach((id) => notify(s, id, "CLIENT", title, body, "/app/feedback-client"));
  return true;
}

/* ---------- Directory, roles ---------- */
export function addUser(s: AppState, actorId: string, u: Omit<User, "id" | "status" | "lastLogin" | "role"> & { role?: Role }) {
  const id = nid("u", s);
  s.users.push({ ...u, id, status: "ACTIF", role: u.role ?? "COLLABORATEUR", lastLogin: s.now });
  logAdmin(s, actorId, "Collaborateurs", "Collaborateur ajouté", `${u.firstName} ${u.lastName}`);
  return id;
}
export function setUserStatus(s: AppState, actorId: string, id: string, status: "ACTIF" | "INACTIF") {
  const u = userOf(s, id);
  if (!u) return;
  u.status = status;
  logAdmin(s, actorId, "Collaborateurs", status === "INACTIF" ? "Collaborateur désactivé" : "Collaborateur réactivé", fullName(u));
}
export function setLeader(s: AppState, actorId: string, ids: string[], leaderId: string) {
  ids.forEach((id) => {
    const u = userOf(s, id);
    if (u) u.leaderIds = [leaderId];
  });
  logAdmin(s, actorId, "Collaborateurs", "Responsable modifié", `${ids.length} collaborateur(s)`);
}
export function setRole(s: AppState, actorId: string, id: string, role: Role) {
  const u = userOf(s, id);
  if (!u) return false;
  if (u.role === "ADMIN_RH" && role !== "ADMIN_RH" && s.users.filter((x) => x.role === "ADMIN_RH" && x.status === "ACTIF").length <= 1) return false;
  const before = u.role;
  u.role = role;
  logAdmin(s, actorId, "Sécurité", "Rôle attribué", `${fullName(u)} → ${role}`, { before, after: role });
  return true;
}

/* ---------- Settings, templates, backups ---------- */
export function updateSettings(s: AppState, actorId: string, patch: (draft: AppState["settings"]) => void, label: string, target = "Paramètres généraux", details?: { before?: string; after?: string }) {
  patch(s.settings);
  logAdmin(s, actorId, "Paramètres", label, target, details);
}
export function updateTemplate(s: AppState, actorId: string, id: string, patch: { subject?: string; body?: string }) {
  const t = s.templates.find((x) => x.id === id);
  if (!t) return;
  Object.assign(t, patch);
  logAdmin(s, actorId, "Paramètres", "Modèle d’e-mail modifié", t.name);
}
export function updateQuestion(s: AppState, actorId: string, id: string, relation: Relation, band: "JUNIOR" | "CONFIRME" | "SENIOR", text: string) {
  const q = s.questions.find((x) => x.id === id);
  if (!q) return;
  q.variants[relation][band] = text;
  logAdmin(s, actorId, "Questions", "Question modifiée", s.competencies.find((c) => c.id === q.competencyId)?.name ?? "Commentaire libre");
}
export function setQuestionActive(s: AppState, actorId: string, id: string, active: boolean) {
  const q = s.questions.find((x) => x.id === id);
  if (!q) return;
  q.active = active;
  logAdmin(s, actorId, "Questions", active ? "Question activée" : "Question désactivée", s.competencies.find((c) => c.id === q.competencyId)?.name ?? "Commentaire libre");
}
export function updateCompetency(s: AppState, actorId: string, id: string, patch: { name?: string; description?: string }) {
  const c = s.competencies.find((x) => x.id === id);
  if (!c) return;
  const before = c.name;
  Object.assign(c, patch);
  logAdmin(s, actorId, "Questions", "Compétence modifiée", c.name, { before, after: c.name });
}
export function createBackup(s: AppState, actorId: string) {
  s.backups.unshift({ id: nid("bk", s), ts: s.now, sizeKb: 410 + (s.backups.length % 7) * 3, kind: "MANUELLE" });
  logAdmin(s, actorId, "Sécurité", "Sauvegarde créée", "Sauvegarde manuelle");
}
export function logRestore(s: AppState, actorId: string, id: string) {
  const b = s.backups.find((x) => x.id === id);
  logAdmin(s, actorId, "Sécurité", "Restauration demandée", b ? fmtDate(b.ts) : id);
}
export function setNotificationPref(s: AppState, kind: NotificationKind, on: boolean) {
  s.settings.notificationPrefs[kind] = on;
}
export const markTour = (s: AppState, key: string) => {
  s.tourDone[key] = true;
};
export const dateHint = (s: AppState, iso: string) => relDate(s.now, iso);
export { average };

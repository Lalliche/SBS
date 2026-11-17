/* Pure calculation rules (spec §8). No weights, no overall score — ever. */
import type {
  AnonymousFeedback,
  ClientLink,
  ClientResponse,
  Competency,
  CompetencySnapshot,
  Grade,
  GradeBand,
  NamedFeedback,
  PendingTask,
  Question,
  QuotaRule,
  Relation,
  Role,
  User,
} from "./types";

/* ---------------- Dates (French, relative to the demo clock) ---------------- */

const DAY = 86_400_000;
export const addDays = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * DAY).toISOString();
export const roundToDay = (iso: string) => iso.slice(0, 10) + "T00:00:00.000Z";
export const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY);

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
export function fmtDay(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
export function fmtDateLong(iso: string) {
  const d = new Date(iso);
  const months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
/** "dans 12 jours" / "il y a 3 jours" / "aujourd'hui" */
export function relDate(now: string, iso: string) {
  const n = daysBetween(roundToDay(now), roundToDay(iso));
  if (n === 0) return "aujourd’hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  if (n > 0) return n < 45 ? `dans ${n} jours` : `dans ${Math.round(n / 30)} mois`;
  const a = Math.abs(n);
  return a < 45 ? `il y a ${a} jours` : `il y a ${Math.round(a / 30)} mois`;
}
export const fmtNum = (n: number | null, digits = 1) =>
  n === null ? "—" : n.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

/* ---------------- People ---------------- */

export const fullName = (u: Pick<User, "firstName" | "lastName">) => `${u.firstName} ${u.lastName}`;
export const initials = (u: Pick<User, "firstName" | "lastName">) => `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();

export function gradeBand(grade: Grade): GradeBand {
  if (grade === "Junior") return "JUNIOR";
  if (grade === "Consultant" || grade === "Senior") return "CONFIRME";
  return "SENIOR";
}

/** RG-02 — relation from giver to recipient. Returns null if it cannot be derived (giver then picks). */
export function relationOf(giver: User, recipient: User): Relation | null {
  if (giver.id === recipient.id) return null;
  if (recipient.leaderIds.includes(giver.id)) return "RESPONSABLE";
  if (giver.leaderIds.includes(recipient.id)) return "EQUIPE";
  if (giver.leaderIds.some((l) => recipient.leaderIds.includes(l))) return "PAIR";
  return null;
}
export const relationLabel: Record<Relation, string> = { RESPONSABLE: "Responsable", PAIR: "Pair", EQUIPE: "Équipe" };

const GRADE_RANK: Record<Grade, number> = { Junior: 0, Consultant: 1, Senior: 2, Manager: 3, Directeur: 4 };
/**
 * Proposed relation giver → recipient. The reporting line wins (RG-02); when there is
 * none, the grades decide, so that anyone can give or ask feedback to anyone.
 * The giver can always correct it in the wizard.
 */
export function suggestedRelation(giver: User, recipient: User): Relation | null {
  if (giver.id === recipient.id) return null;
  const byLine = relationOf(giver, recipient);
  if (byLine) return byLine;
  const d = GRADE_RANK[giver.grade] - GRADE_RANK[recipient.grade];
  return d > 0 ? "RESPONSABLE" : d < 0 ? "EQUIPE" : "PAIR";
}
/** Direction of the feedback as the recipient lives it: from above, from a peer, from below. */
export const directionLabel: Record<Relation, string> = { RESPONSABLE: "Descendant", PAIR: "Pair", EQUIPE: "Ascendant" };
export const directionHint: Record<Relation, string> = { RESPONSABLE: "De quelqu’un de plus senior", PAIR: "D’un pair", EQUIPE: "De quelqu’un de plus junior" };

/* ---------------- Averages (RG-04 / RG-05 / RG-06) ---------------- */

interface Rated {
  ratings: Record<string, number>;
  relation?: Relation | null;
}

export function validRating(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 5;
}

/** RG-05: sum of ratings given ÷ number of ratings given. No ratings → null. Missing is NOT zero. */
export function average(values: number[]): number | null {
  const v = values.filter(validRating);
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

export function competencyStats(
  items: Array<Rated & { answers?: Record<string, string> }>,
  competencies: Competency[],
  relation?: Relation,
): CompetencySnapshot[] {
  const scoped = relation ? items.filter((i) => i.relation === relation) : items;
  return competencies.map((c) => {
    const ratings = scoped.map((i) => i.ratings[c.id]).filter(validRating);
    return {
      competencyId: c.id,
      average: average(ratings),
      ratingCount: ratings.length,
      feedbackCount: scoped.length,
    };
  });
}

/** Evolution: delta against the archived cycle, only if present in both. */
export function evolution(current: number | null, archived: number | null): number | null {
  if (current === null || archived === null) return null;
  return Math.round((current - archived) * 10) / 10;
}

/* ---------------- Quota ---------------- */

export interface QuotaProgress {
  received: number;
  fromDirectReports: number;
  target: number;
  directTarget: number;
  needsFromTeam: boolean;
  teamFeedback: number;
  ratio: number; // received / target, 0..1 (capped)
  reached: boolean;
  missing: number;
  missingDirect: number;
  /** Feedback GIVEN (CDC 3.10): named sends + requests answered (never reveals named vs anonymous). */
  given: number;
  minGiven: number;
  missingGiven: number;
  /** Giving is mandatory for this user's grade (CDC 3.5). */
  mandatory: boolean;
  status: "ATTEINT" | "EN_BONNE_VOIE" | "EN_RETARD";
}

/**
 * Given = named feedback sent + requests answered whose answer is not already counted as a named send.
 * Spontaneous anonymous sends cannot be attributed to anyone, by design (anonymity), so they are not counted.
 */
export function givenCount(userId: string, named: NamedFeedback[], tasks: PendingTask[]): number {
  const sent = named.filter((f) => f.authorId === userId && f.status === "ENVOYE");
  const namedForRequest = new Set(sent.map((f) => f.requestId).filter(Boolean));
  const answeredOther = tasks.filter((t) => t.giverId === userId && t.status === "TRAITEE" && !namedForRequest.has(t.requestId)).length;
  return sent.length + answeredOther;
}

export function quotaProgress(args: {
  user: User;
  users: User[];
  named: NamedFeedback[];
  anonymous: AnonymousFeedback[];
  tasks: PendingTask[];
  rule: QuotaRule;
  anonymousCounts: boolean;
  cycleProgress: number; // 0..1 elapsed share of the cycle
}): QuotaProgress {
  const { user, users, named, anonymous, tasks, rule, anonymousCounts, cycleProgress } = args;
  const reports = new Set(users.filter((u) => u.leaderIds.includes(user.id)).map((u) => u.id));
  const leaders = new Set(user.leaderIds);
  // "Direct" = the person's leader or direct reports (their direct circle).
  const isDirect = (id: string) => reports.has(id) || leaders.has(id);
  let received = 0;
  let fromDirect = 0;
  let teamFeedback = 0;
  const nm = named.filter((f) => f.recipientId === user.id && f.status === "ENVOYE");
  received += nm.length;
  for (const f of nm) {
    if (isDirect(f.authorId)) fromDirect += 1;
    if (reports.has(f.authorId)) teamFeedback += 1;
  }
  if (anonymousCounts) {
    const an = anonymous.filter((f) => f.recipientId === user.id);
    received += an.length;
    // The author of an anonymous feedback is unknown; only its (optional) relation is.
    fromDirect += an.filter((f) => f.relation === "EQUIPE" || f.relation === "RESPONSABLE").length;
    teamFeedback += an.filter((f) => f.relation === "EQUIPE").length;
  }
  const given = givenCount(user.id, named, tasks);
  const isLeader = reports.size > 0;
  const needsFromTeam = isLeader && rule.teamLeaderNeedsTeamFeedback;
  const directTarget = rule.minFromDirectReports;
  const target = rule.minReceived;
  const missing = Math.max(0, target - received);
  const missingDirect = Math.max(0, directTarget - fromDirect) + (needsFromTeam && teamFeedback === 0 ? 1 : 0);
  const missingGiven = Math.max(0, rule.minGiven - given);
  const mandatory = rule.mandatory.enabled && rule.mandatory.grades.includes(user.grade);
  const reached = missing === 0 && missingDirect === 0 && missingGiven === 0;
  const expected = target * cycleProgress;
  const behind = received < expected * 0.75 || (mandatory && given < rule.minGiven * cycleProgress * 0.75);
  const status: QuotaProgress["status"] = reached ? "ATTEINT" : behind ? "EN_RETARD" : "EN_BONNE_VOIE";
  return {
    received,
    fromDirectReports: fromDirect,
    target,
    directTarget,
    needsFromTeam,
    teamFeedback,
    ratio: Math.min(1, target ? received / target : 1),
    reached,
    missing,
    missingDirect,
    given,
    minGiven: rule.minGiven,
    missingGiven,
    mandatory,
    status,
  };
}

export const quotaStatusLabel = { ATTEINT: "Atteint", EN_BONNE_VOIE: "En bonne voie", EN_RETARD: "En retard" } as const;

/* ---------------- Questions ---------------- */

export function questionText(q: Question, relation: Relation, band: GradeBand): string {
  return q.variants[relation]?.[band] ?? q.variants.PAIR.CONFIRME;
}
/** The question bank should hold 5–8 active collaborator questions (spec 9.8). */
export function questionBankWarning(questions: Question[]): string | null {
  const n = questions.filter((q) => q.kind === "COLLAB" && q.active).length;
  if (n < 5) return `La banque contient ${n} questions actives : il en faut au moins 5.`;
  if (n > 8) return `La banque contient ${n} questions actives : il en faut au plus 8.`;
  return null;
}

/* ---------------- Client links ---------------- */

export type LinkValidity = "OK" | "EXPIRE" | "DESACTIVE" | "MAX_ATTEINT";
export function clientLinkValidity(link: ClientLink, responses: ClientResponse[], now: string): LinkValidity {
  if (link.status === "DESACTIVE") return "DESACTIVE";
  if (link.status === "EXPIRE" || new Date(now) >= new Date(link.expiresAt)) return "EXPIRE";
  if (responses.filter((r) => r.linkId === link.id).length >= link.maxResponses) return "MAX_ATTEINT";
  return "OK";
}

/* ---------------- Permissions ---------------- */

export type Action =
  | "feedback.give"
  | "request.create"
  | "mission.create"
  | "team.view"
  | "synthesis.write"
  | "cycle.manage"
  | "follow.view"
  | "clientlink.manage"
  | "users.directory"
  | "referentials.edit"
  | "messages.manage"
  | "journal.view"
  | "roles.manage"
  | "settings.org"
  | "settings.tech"
  | "help.view";

const MATRIX: Record<Action, Role[]> = {
  "feedback.give": ["COLLABORATEUR", "RESPONSABLE", "ADMIN_RH"],
  "request.create": ["COLLABORATEUR", "RESPONSABLE", "ADMIN_RH"],
  "mission.create": ["RESPONSABLE"], // CDC 3.1: missions are managed by responsables, never by HR
  "team.view": ["RESPONSABLE"],
  "synthesis.write": ["RESPONSABLE"],
  "cycle.manage": ["ADMIN_RH"],
  "follow.view": ["ADMIN_RH"],
  "clientlink.manage": ["COLLABORATEUR", "RESPONSABLE"], // the responsable de mission or the collaborateur concerned
  "users.directory": ["ADMIN_RH", "ADMIN_TECH", "RESPONSABLE"],
  "referentials.edit": ["ADMIN_RH"],
  "messages.manage": ["ADMIN_RH"],
  "journal.view": ["ADMIN_RH", "ADMIN_TECH"],
  "roles.manage": ["ADMIN_TECH"],
  "settings.org": ["ADMIN_RH"],
  "settings.tech": ["ADMIN_TECH"],
  "help.view": ["COLLABORATEUR", "RESPONSABLE", "ADMIN_RH", "ADMIN_TECH"],
};

export function can(user: Pick<User, "role"> | null | undefined, action: Action): boolean {
  if (!user) return false;
  return MATRIX[action].includes(user.role);
}

export const roleLabel: Record<Role, string> = {
  COLLABORATEUR: "Collaborateur",
  RESPONSABLE: "Responsable d’équipe / de mission",
  ADMIN_RH: "Admin RH",
  ADMIN_TECH: "Admin technique",
};

/* ---------------- Cycle progress ---------------- */
export function cycleProgress(start: string, end: string, now: string) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const n = new Date(now).getTime();
  return Math.min(1, Math.max(0, (n - s) / (e - s)));
}

/** "Name · OTP", or just the name for a mission added by hand without a code. */
export const missionLabel = (m: { name: string; otp: string }) => (m.otp ? `${m.name} · ${m.otp}` : m.name);

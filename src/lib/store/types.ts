/* SBS 360° — data model (spec §7.1). Ids are strings. */

export type Role = "COLLABORATEUR" | "RESPONSABLE" | "ADMIN_RH" | "ADMIN_TECH";
export type Relation = "RESPONSABLE" | "PAIR" | "EQUIPE";
export type GradeBand = "JUNIOR" | "CONFIRME" | "SENIOR";
export type Grade = "Junior" | "Consultant" | "Senior" | "Manager" | "Directeur";
export type CycleStatus = "A_VENIR" | "OUVERT" | "ARCHIVE";
export type MissionStatus = "EN_COURS" | "TERMINEE";
export type TaskStatus = "EN_ATTENTE" | "TRAITEE" | "DECLINEE" | "RETOURNEE";
export type SynthesisStatus = "NON_COMMENCEE" | "EN_REDACTION" | "VALIDEE";
export type LinkStatus = "ACTIF" | "EXPIRE" | "DESACTIVE";
export type AiMode = "OFF" | "MANUEL" | "ASSISTE";
export type Scenario = 1 | 2 | 3 | 4;

export interface Department {
  id: string;
  name: string;
  hue: number; // deterministic tint used for avatars / chips
}

export interface User {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string;
  jobTitle: string;
  grade: Grade;
  leaderIds: string[]; // single leader today, model ready for Q41
  status: "ACTIF" | "INACTIF";
  role: Role;
  lastLogin: string;
}

export interface QuotaRule {
  minReceived: number;
  /** CDC 3.10: objectives cover feedback given AND received. */
  minGiven: number;
  minFromDirectReports: number;
  teamLeaderNeedsTeamFeedback: boolean;
  /** CDC 3.5: giving feedback is mandatory for some profiles (e.g. juniors). */
  mandatory: { enabled: boolean; grades: Grade[] };
}

export interface ReminderRule {
  id: string;
  label: string;
  kind: "DEMANDES_EN_ATTENTE" | "ECART_OBJECTIF" | "FIN_DE_CYCLE";
  cadence: "HEBDOMADAIRE" | "MENSUEL" | "J_MOINS_30";
  enabled: boolean;
  lastRun: string | null;
}

export interface Cycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: CycleStatus;
  quotaRule: QuotaRule;
  reminderRules: ReminderRule[];
  aiMode: AiMode;
}

export interface Mission {
  id: string;
  cycleId: string;
  name: string;
  /** CDC 3.4: numéro OTP and budgeted hours. */
  otp: string;
  hours: number;
  description: string;
  startDate: string;
  endDate: string;
  leadId: string;
  status: MissionStatus;
  participantIds: string[];
}

export interface FeedbackRequest {
  id: string;
  cycleId: string;
  /** Post-contract change: a request may target anyone, with or without a mission. */
  missionId: string | null;
  /** The requester's role on the mission (required when a mission is chosen). */
  role?: string;
  /** Optional: hours the requester spent on the mission. Informative only, never a limit. */
  hours?: number;
  requesterId: string;
  recipientIds: string[]; // people asked to give feedback
  message: string;
  createdAt: string;
  dueDate: string;
  allowAnonymous: boolean;
  /** Aggregate counter only — never joinable to a person (spec 7.2.4). */
  anonymousReplies: number;
}

/** Stored on the giver's side only. Not joinable to any feedback. */
export interface PendingTask {
  id: string;
  giverId: string;
  requestId: string;
  status: TaskStatus;
  reason?: string;
}

export interface Competency {
  id: string;
  name: string;
  description: string;
  order: number;
}

export interface Question {
  id: string;
  competencyId: string | null; // null = free comment
  kind: "COLLAB" | "CLIENT";
  order: number;
  active: boolean;
  /** Label shown instead of "Commentaire libre" for a question without competency. */
  topic?: string;
  /** Relations (giver → recipient) for which this question is asked. Absent = all. */
  appliesTo?: Relation[];
  /** variants[relation][gradeBand] */
  variants: Record<Relation, Record<GradeBand, string>>;
  clientText?: string;
}

export interface NamedFeedback {
  id: string;
  cycleId: string;
  missionId: string | null;
  authorId: string;
  recipientId: string;
  relation: Relation;
  requestId?: string;
  answers: Record<string, string>; // questionId -> text
  ratings: Record<string, number>; // competencyId -> 1..5
  createdAt: string;
  status: "BROUILLON" | "ENVOYE";
  hiddenByHR?: boolean;
}

/**
 * ANONYMITY: this type deliberately has NO author field, NO request id and
 * NO giver reference (spec 7.2). Do not add any. `engine.test.ts` enforces it.
 */
export interface AnonymousFeedback {
  id: string;
  cycleId: string;
  missionId: string | null;
  recipientId: string;
  relation: Relation | null;
  answers: Record<string, string>;
  ratings: Record<string, number>;
  createdAt: string; // rounded to the day
  hiddenByHR?: boolean;
}

export interface SynthesisItem {
  id: string;
  competencyId: string;
  text: string;
  fromAi?: boolean;
}

export interface AiSuggestion {
  id: string;
  competencyId: string;
  kind: "STRENGTH" | "AXIS";
  summary: string;
  suggestion: string;
  basedOn: { responses: number; missions: number };
  status: "PENDING" | "USED" | "IGNORED";
  helpful?: boolean;
}

export interface CompetencySnapshot {
  competencyId: string;
  average: number | null;
  ratingCount: number;
  feedbackCount: number;
}

export interface Synthesis {
  id: string;
  cycleId: string;
  userId: string;
  status: SynthesisStatus;
  strengths: SynthesisItem[];
  axes: SynthesisItem[];
  aiSuggestions: AiSuggestion[];
  snapshot?: CompetencySnapshot[]; // frozen at validation / archiving
  validatedAt?: string;
}

export interface ClientLink {
  id: string;
  token: string;
  missionId: string;
  createdById: string;
  /** CDC 3.7: ONE link per client — the client is known from creation. */
  clientName: string;
  company: string;
  clientEmail: string;
  title: string;
  welcome: string;
  questionIds: string[];
  expiresAt: string;
  maxResponses: number;
  status: LinkStatus;
  createdAt: string;
}

export interface ClientResponse {
  id: string;
  linkId: string;
  missionId: string;
  clientName: string;
  company: string;
  answers: Record<string, string>;
  rating?: number;
  createdAt: string;
}

export type NotificationKind = "DEMANDE" | "RAPPEL" | "SYNTHESE" | "SYSTEME" | "FEEDBACK" | "CLIENT";
export interface Notification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  read: boolean;
}

export type AdminCategory = "Cycles" | "Missions" | "Questions" | "Liens client" | "Collaborateurs" | "Paramètres" | "Sécurité" | "Feedbacks";
/** Admin actions only. Never feedback authorship (spec 7.1). `actorId` is null for anonymous sends. */
export interface AdminEvent {
  id: string;
  ts: string;
  actorId: string | null;
  category: AdminCategory;
  action: string;
  target: string;
  details?: { before?: string; after?: string };
}

export interface VisibilityRules {
  seeReceived: boolean; // Q1
  seeOwnSynthesis: boolean; // Q2
  showAuthorName: boolean; // Q3
  leaderSeesAnonymous: boolean; // Q4
  n1SeesSyntheses: boolean; // Q5
  rhSeesIndividual: boolean; // Q6
  seeClientFeedback: boolean; // Q7
  participantsSeeClient: boolean; // Q8
  allowAnonymousOnRequest: boolean; // Q9
  showRelationOnAnonymous: boolean; // Q10
  rhCanHideAnonymous: boolean; // Q11
  anonymousCountsInQuota: boolean; // Q12
  anyoneCreatesMission: boolean; // Q13
  feedbackWithoutMission: boolean; // Q14
  radarByRelation: boolean; // Q21
  seeCompetencyAverage: boolean; // Q22
  pdfForCollaborateur: boolean; // Q35
  multipleLeaders: boolean; // Q41
}

export interface Settings {
  brand: { name: string; primary: string; secondary: string; accent: string };
  visibility: VisibilityRules;
  noteMode: "PAR_COMPETENCE" | "PAR_MISSION";
  noteRequired: boolean;
  quotas: QuotaRule;
  retentionDays: number;
  sender: string;
  notificationPrefs: Record<NotificationKind, boolean>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}
export interface EmailSend {
  id: string;
  ts: string;
  templateId: string;
  recipients: number;
  delivered: number;
  opened: number;
  audience: string;
}
export interface Backup {
  id: string;
  ts: string;
  sizeKb: number;
  kind: "AUTO" | "MANUELLE";
}
export interface Draft {
  recipientId: string | null;
  missionId: string | null;
  requestId: string | null;
  type: "NOMINATIF" | "ANONYME" | null;
  answers: Record<string, string>;
  ratings: Record<string, number>;
  savedAt: string | null;
  step: number;
  cycleId?: string;
}
export interface Evaluation {
  userId: string;
  requestId: string;
}

export interface AppState {
  v: number;
  scenario: Scenario;
  now: string; // demo clock (ISO)
  session: { userId: string | null };
  departments: Department[];
  users: User[];
  cycles: Cycle[];
  missions: Mission[];
  requests: FeedbackRequest[];
  tasks: PendingTask[];
  competencies: Competency[];
  questions: Question[];
  named: NamedFeedback[];
  anonymous: AnonymousFeedback[];
  syntheses: Synthesis[];
  clientLinks: ClientLink[];
  clientResponses: ClientResponse[];
  notifications: Notification[];
  adminEvents: AdminEvent[];
  settings: Settings;
  templates: EmailTemplate[];
  emailSends: EmailSend[];
  backups: Backup[];
  drafts: Record<string, Draft>; // by userId
  viewingCycleId: string | null; // archived cycle opened read-only
  tourDone: Record<string, boolean>;
  clientDevices: string[]; // link ids this device already answered (soft limit)
}

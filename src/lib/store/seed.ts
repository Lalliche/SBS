/* Deterministic seed (spec §7.3). Same scenario → same data, always. */
import { addDays, relationOf, roundToDay } from "./engine";
import { freezeSnapshots } from "./snapshots";
import { ANSWER_BANK, AXIS_TEXT, COMPETENCIES, FREE_COMMENTS, STRENGTH_TEXT, CLIENT_COMMENTS, CLIENT_QUESTIONS, buildVariants } from "./texts";
import type {
  AdminEvent,
  AnonymousFeedback,
  AppState,
  Cycle,
  Department,
  Grade,
  NamedFeedback,
  Notification,
  PendingTask,
  Question,
  Role,
  Scenario,
  Settings,
  Synthesis,
  User,
} from "./types";

export const STATE_VERSION = 6;

/* ---------- PRNG ---------- */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rng = () => number;
export const pick = <T,>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
const shuffle = <T,>(rng: Rng, arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* ---------- Scenario clocks ---------- */
export const SCENARIO_NOW: Record<Scenario, string> = {
  1: "2026-07-06T08:30:00.000Z",
  2: "2026-11-08T09:00:00.000Z",
  3: "2027-06-10T09:00:00.000Z",
  4: "2027-07-02T09:00:00.000Z",
};
export const SCENARIO_LABEL: Record<Scenario, string> = {
  1: "Début de cycle",
  2: "Cycle en cours",
  3: "Fin de cycle — synthèses à rédiger",
  4: "Nouveau cycle (ancien archivé)",
};
const TARGET_FEEDBACK: Record<Scenario, number> = { 1: 14, 2: 160, 3: 330, 4: 330 };

/* ---------- Static reference data ---------- */
const departments: Department[] = [
  { id: "d-strategy", name: "Strategy & Consulting", hue: 8 },
  { id: "d-tech", name: "Engineering & Tech", hue: 212 },
  { id: "d-people", name: "People & HR", hue: 150 },
  { id: "d-finance", name: "Finance & Operations", hue: 38 },
  { id: "d-direction", name: "Direction", hue: 270 },
];

type U = [id: string, first: string, last: string, dept: string, job: string, grade: Grade, leader: string | null, role: Role];
const USERS: U[] = [
  ["karim", "Karim", "Saci", "d-direction", "Managing Partner", "Directeur", null, "ADMIN_TECH"],
  ["amel", "Amel", "Rezig", "d-direction", "Associée gérante", "Directeur", null, "RESPONSABLE"],
  ["thomas", "Thomas", "Dubois", "d-strategy", "Partner", "Directeur", "karim", "RESPONSABLE"],
  ["rachid", "Rachid", "Mansouri", "d-strategy", "Partner", "Directeur", "karim", "RESPONSABLE"],
  ["lucas", "Lucas", "Bernard", "d-strategy", "Principal", "Manager", "thomas", "COLLABORATEUR"],
  ["claire", "Claire", "Moreau", "d-strategy", "Consultante senior", "Senior", "thomas", "COLLABORATEUR"],
  ["yanis", "Yanis", "Benali", "d-strategy", "Consultant", "Consultant", "thomas", "COLLABORATEUR"],
  ["imane", "Imane", "Haddad", "d-strategy", "Consultante", "Consultant", "thomas", "COLLABORATEUR"],
  ["nadia", "Nadia", "Cherif", "d-strategy", "Consultante junior", "Junior", "thomas", "COLLABORATEUR"],
  ["samir", "Samir", "Boudiaf", "d-strategy", "Principal", "Manager", "rachid", "COLLABORATEUR"],
  ["meriem", "Meriem", "Khelifi", "d-strategy", "Consultante", "Consultant", "rachid", "COLLABORATEUR"],
  ["amine", "Amine", "Zerrouki", "d-tech", "Directeur technique", "Directeur", "karim", "RESPONSABLE"],
  ["lina", "Lina", "Bouzid", "d-tech", "Ingénieure senior", "Senior", "amine", "COLLABORATEUR"],
  ["mehdi", "Mehdi", "Kaci", "d-tech", "Ingénieur data", "Consultant", "amine", "COLLABORATEUR"],
  ["sarah", "Sarah", "Merabet", "d-tech", "Ingénieure logiciel", "Consultant", "amine", "COLLABORATEUR"],
  ["anis", "Anis", "Hamidi", "d-tech", "Ingénieur DevOps", "Senior", "amine", "COLLABORATEUR"],
  ["rania", "Rania", "Tebboune", "d-tech", "Ingénieure junior", "Junior", "amine", "COLLABORATEUR"],
  ["bilal", "Bilal", "Sahraoui", "d-tech", "Ingénieur logiciel", "Consultant", "amine", "COLLABORATEUR"],
  ["kenza", "Kenza", "Ouyahia", "d-tech", "Data analyst", "Junior", "amine", "COLLABORATEUR"],
  ["sophie", "Sophie", "Martin", "d-people", "Directrice du Capital Humain", "Directeur", "amel", "ADMIN_RH"],
  ["djamel", "Djamel", "Aouchiche", "d-people", "Responsable recrutement", "Manager", "amel", "COLLABORATEUR"],
  ["houda", "Houda", "Lakhdari", "d-people", "Chargée de formation", "Consultant", "amel", "COLLABORATEUR"],
  ["farid", "Farid", "Belhadj", "d-people", "HR Business Partner", "Senior", "amel", "COLLABORATEUR"],
  ["soraya", "Soraya", "Medjdoub", "d-people", "Assistante RH", "Junior", "amel", "COLLABORATEUR"],
  ["omar", "Omar", "Benyoucef", "d-finance", "Directeur financier", "Directeur", "amel", "RESPONSABLE"],
  ["leila", "Leïla", "Ferhat", "d-finance", "Contrôleuse de gestion", "Senior", "omar", "COLLABORATEUR"],
  ["yacine", "Yacine", "Bouabdallah", "d-finance", "Comptable senior", "Senior", "omar", "COLLABORATEUR"],
  ["wafa", "Wafa", "Selmani", "d-finance", "Chargée des opérations", "Consultant", "omar", "COLLABORATEUR"],
  ["nabil", "Nabil", "Chaoui", "d-finance", "Office manager", "Consultant", "omar", "COLLABORATEUR"],
  ["hind", "Hind", "Zitouni", "d-finance", "Assistante de direction", "Junior", "omar", "COLLABORATEUR"],
];
export const uid = (k: string) => `u-${k}`;

function buildUsers(): User[] {
  return USERS.map(([k, first, last, dept, job, grade, leader, role], i) => ({
    id: uid(k),
    matricule: `SBS-${String(1000 + i * 7).padStart(4, "0")}`,
    firstName: first,
    lastName: last,
    email: `${first.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}.${last.toLowerCase()}@sbsfirm.example`,
    departmentId: dept,
    jobTitle: job,
    grade,
    leaderIds: leader ? [uid(leader)] : [],
    status: "ACTIF",
    role,
    lastLogin: addDays("2026-11-08T09:00:00.000Z", -((i * 3) % 11)),
  }));
}

const TOGETHER_TEXT = "Comment avez-vous travaillé ensemble ? Dans quel contexte, et sur quoi ?";
const questionKeys: Array<[string, string | null]> = [
  ["q-1", "c-inspirer"],
  ["q-2", "c-developper"],
  ["q-3", "c-integrite"],
  ["q-4", "c-expertise"],
  ["q-5", "c-engagements"],
  ["q-6", "c-client"],
  ["q-7", null],
];
function buildQuestions(): Question[] {
  const collab: Question[] = questionKeys.map(([id, comp], i) => ({
    id,
    competencyId: comp,
    kind: "COLLAB",
    order: i + 1,
    active: true,
    variants: buildVariants(comp ?? "comment"),
  }));
  // Post-contract change (PwC reference): asked for downward and peer feedback only.
  const together: Question = {
    id: "q-0",
    competencyId: null,
    kind: "COLLAB",
    order: 0,
    active: true,
    topic: "Collaboration",
    appliesTo: ["RESPONSABLE", "PAIR"],
    variants: Object.fromEntries((["RESPONSABLE", "PAIR", "EQUIPE"] as const).map((r) => [r, { JUNIOR: TOGETHER_TEXT, CONFIRME: TOGETHER_TEXT, SENIOR: TOGETHER_TEXT }])) as Question["variants"],
  };
  const client: Question[] = CLIENT_QUESTIONS.map((c, i) => ({
    id: c.id,
    competencyId: null,
    kind: "CLIENT",
    order: i + 1,
    active: true,
    variants: buildVariants("comment"),
    clientText: c.text,
  }));
  return [together, ...collab, ...client];
}

/* ---------- Missions ---------- */
type M = [id: string, name: string, desc: string, start: string, end: string, lead: string, people: string[]];
const MISSIONS: M[] = [
  ["m-01", "Schéma directeur de transformation — Secteur énergie", "Cadrage de la feuille de route de transformation et gouvernance du programme.", "2026-07-06", "2027-01-29", "thomas", ["thomas", "lucas", "claire", "yanis", "imane"]],
  ["m-02", "Revue de la gouvernance des filiales", "Diagnostic des instances de décision et des délégations d’autorité.", "2026-08-03", "2027-02-26", "rachid", ["rachid", "samir", "meriem", "nadia"]],
  ["m-03", "Plateforme de pilotage de la performance", "Conception d’un tableau de bord de pilotage pour la direction.", "2026-07-13", "2027-03-31", "amine", ["amine", "lina", "mehdi", "sarah", "claire", "thomas"]],
  ["m-04", "Audit de conformité opérationnelle", "Revue des processus clés et plan de remédiation priorisé.", "2026-08-17", "2027-04-16", "samir", ["samir", "meriem", "imane", "nadia", "leila"]],
  ["m-05", "Refonte du dispositif de rémunération", "Étude comparative et proposition d’une grille de rémunération.", "2026-07-20", "2027-05-14", "amel", ["amel", "sophie", "djamel", "houda", "lucas", "farid"]],
  ["m-06", "Cartographie des risques — Secteur bancaire", "Identification et hiérarchisation des risques opérationnels.", "2026-09-01", "2027-05-28", "thomas", ["thomas", "lucas", "nadia", "yanis", "claire", "rachid"]],
  ["m-07", "Optimisation du budget et du reporting", "Simplification du cycle budgétaire et du reporting mensuel.", "2026-09-14", "2027-03-12", "omar", ["omar", "leila", "yacine", "samir"]],
  ["m-08", "Mise en place d’un entrepôt de données", "Structuration des flux de données et des indicateurs de référence.", "2026-07-27", "2027-06-04", "amine", ["amine", "mehdi", "kenza", "anis", "bilal"]],
  ["m-09", "Programme de formation des cadres", "Conception d’un parcours de développement pour les managers.", "2026-09-28", "2027-06-18", "houda", ["houda", "sophie", "imane", "nadia", "soraya"]],
  ["m-10", "Étude de marché — Industrie agroalimentaire", "Analyse de la demande et positionnement concurrentiel.", "2026-10-05", "2027-04-02", "rachid", ["rachid", "meriem", "yanis", "samir", "kenza"]],
  ["m-11", "Déploiement d’un outil de gestion documentaire", "Choix, paramétrage et conduite du changement.", "2026-10-19", "2027-06-11", "lina", ["lina", "sarah", "rania", "bilal", "wafa"]],
  ["m-12", "Accompagnement à la clôture annuelle", "Appui à la clôture des comptes et au contrôle interne.", "2026-07-01", "2026-10-30", "omar", ["omar", "yacine", "leila", "wafa"]],
  ["m-13", "Diagnostic organisationnel — Groupe industriel", "État des lieux de l’organisation et recommandations de simplification.", "2026-07-01", "2026-10-23", "thomas", ["thomas", "lucas", "claire", "imane"]],
  ["m-14", "Séminaire de direction — préparation", "Préparation et animation du séminaire annuel de la direction.", "2026-11-02", "2027-02-12", "amel", ["amel", "sophie", "thomas", "rachid", "omar"]],
];

/* ---------- Settings, templates ---------- */
function buildSettings(): Settings {
  return {
    brand: { name: "Sovereign Business & Strategy", primary: "#050703", secondary: "#F3F0EA", accent: "#E4042C" },
    visibility: {
      seeReceived: true,
      seeOwnSynthesis: true,
      showAuthorName: true,
      leaderSeesAnonymous: true,
      n1SeesSyntheses: false,
      rhSeesIndividual: false,
      seeClientFeedback: false,
      participantsSeeClient: false,
      allowAnonymousOnRequest: true,
      showRelationOnAnonymous: false, // CDC 3.8: the giver's relation is shown except on anonymous feedback
      rhCanHideAnonymous: true,
      anonymousCountsInQuota: true,
      anyoneCreatesMission: true, // SBS (Nov 2026): every collaborateur can add a mission, like "Ajouter un projet" on Feedback Exchange
      feedbackWithoutMission: true,
      radarByRelation: true,
      seeCompetencyAverage: true,
      pdfForCollaborateur: true,
      multipleLeaders: false,
    },
    noteMode: "PAR_COMPETENCE",
    noteRequired: false,
    quotas: { minReceived: 5, minGiven: 3, minFromDirectReports: 1, teamLeaderNeedsTeamFeedback: true, mandatory: { enabled: true, grades: ["Junior"] } },
    retentionDays: 90,
    sender: "feedback@sbsfirm.example",
    notificationPrefs: { DEMANDE: true, RAPPEL: true, SYNTHESE: true, SYSTEME: true, FEEDBACK: true, CLIENT: true },
  };
}

const TEMPLATES = [
  { id: "t-demande", name: "Demande de feedback reçue", subject: "{{prenom}}, un feedback vous est demandé sur « {{mission}} »", body: "Bonjour {{prenom}},\n\nUn collègue souhaite recueillir votre feedback sur la mission « {{mission}} ». Vous pouvez répondre avec votre nom ou de façon anonyme avant le {{date_limite}}.\n\n{{lien}}" },
  { id: "t-rappel-demande", name: "Rappel de demande", subject: "Rappel : un feedback vous attend", body: "Bonjour {{prenom}},\n\nUne demande de feedback sur « {{mission}} » est toujours en attente. Merci d’y répondre avant le {{date_limite}}.\n\n{{lien}}" },
  { id: "t-rappel-objectif", name: "Rappel d’objectif", subject: "Votre objectif de feedbacks pour ce cycle", body: "Bonjour {{prenom}},\n\nVotre objectif de feedbacks reçus n’est pas encore atteint. Vous pouvez demander un feedback aux personnes avec lesquelles vous avez travaillé.\n\n{{lien}}" },
  { id: "t-synthese", name: "Synthèse disponible", subject: "Votre synthèse de fin d’année est disponible", body: "Bonjour {{prenom}},\n\nVotre synthèse a été validée par votre responsable. Vous pouvez la consulter dans la plateforme.\n\n{{lien}}" },
  { id: "t-fin-cycle", name: "Fin de cycle", subject: "Le cycle se termine le {{date_limite}}", body: "Bonjour {{prenom}},\n\nLe cycle en cours se termine bientôt. Pensez à donner ou demander vos derniers feedbacks.\n\n{{lien}}" },
  { id: "t-client", name: "Lien client", subject: "Votre avis sur la mission « {{mission}} »", body: "Bonjour,\n\nNous serions heureux de recueillir votre retour sur la mission « {{mission}} ». Cela ne prend que quelques minutes.\n\n{{lien}}" },
];

/* ---------- Strength profiles (drive ratings & tone) ---------- */
export type Profile = Record<string, number>;
export function profileFor(rng: Rng, key: string): Profile {
  const base: Profile = {};
  for (const c of COMPETENCIES) base[c.id] = 3.0 + rng() * 1.4;
  if (key === "lucas") Object.assign(base, { "c-inspirer": 2.6, "c-developper": 3.5, "c-integrite": 3.9, "c-expertise": 4.7, "c-engagements": 4.6, "c-client": 3.8 });
  if (key === "claire") Object.assign(base, { "c-inspirer": 4.2, "c-client": 4.6 });
  return base;
}

export function makeAnswers(rng: Rng, profile: Profile, mission: string | null) {
  const answers: Record<string, string> = {};
  for (const [qid, comp] of questionKeys) {
    if (!comp) {
      answers[qid] = pick(rng, FREE_COMMENTS);
      continue;
    }
    const mean = profile[comp] + (rng() - 0.5) * 0.9;
    const bank = ANSWER_BANK[comp];
    const tier = mean >= 3.9 ? "strong" : mean <= 3.1 ? "weak" : rng() < 0.5 ? "mid" : mean > 3.5 ? "strong" : "weak";
    let txt = pick(rng, bank[tier as "strong" | "mid" | "weak"]);
    if (mission && rng() < 0.25) txt += ` (Observé notamment sur « ${mission} ».)`;
    answers[qid] = txt;
  }
  return answers;
}
export function makeRatings(rng: Rng, profile: Profile, withRatings: boolean) {
  if (!withRatings) return {};
  const r: Record<string, number> = {};
  for (const c of COMPETENCIES) r[c.id] = Math.max(1, Math.min(5, Math.round(profile[c.id] + (rng() - 0.5) * 1.4)));
  return r;
}

/* ---------- Build ---------- */
export function buildSeed(scenario: Scenario, sessionUserId: string | null = null): AppState {
  const rng = mulberry32(1000 + scenario * 17);
  const now = SCENARIO_NOW[scenario];
  const users = buildUsers();
  const userById = new Map(users.map((u) => [u.id, u]));
  const profiles = new Map(USERS.map(([k]) => [uid(k), profileFor(rng, k)]));
  const questions = buildQuestions();
  const settings = buildSettings();

  /* Cycles */
  const reminderRules = (last: string | null) => [
    { id: "rr-1", label: "Demandes en attente", kind: "DEMANDES_EN_ATTENTE" as const, cadence: "HEBDOMADAIRE" as const, enabled: true, lastRun: last },
    { id: "rr-2", label: "Écart à l’objectif", kind: "ECART_OBJECTIF" as const, cadence: "MENSUEL" as const, enabled: true, lastRun: last },
    { id: "rr-3", label: "Avant la fin du cycle", kind: "FIN_DE_CYCLE" as const, cadence: "J_MOINS_30" as const, enabled: scenario >= 2, lastRun: null },
  ];
  const archivedFY27 = scenario === 4;
  const cycles: Cycle[] = [
    { id: "cy-fy26", name: "FY26", startDate: "2025-07-01T00:00:00.000Z", endDate: "2026-06-30T23:59:59.000Z", status: "ARCHIVE", quotaRule: settings.quotas, reminderRules: [], aiMode: "OFF" },
    {
      id: "cy-fy27",
      name: "FY27",
      startDate: "2026-07-01T00:00:00.000Z",
      endDate: "2027-06-30T23:59:59.000Z",
      status: archivedFY27 ? "ARCHIVE" : "OUVERT",
      quotaRule: settings.quotas,
      reminderRules: reminderRules(scenario === 1 ? null : addDays(now, -6)),
      aiMode: "MANUEL",
    },
  ];
  if (archivedFY27) {
    cycles.push({ id: "cy-fy28", name: "FY28", startDate: "2027-07-01T00:00:00.000Z", endDate: "2028-06-30T23:59:59.000Z", status: "OUVERT", quotaRule: settings.quotas, reminderRules: reminderRules(null), aiMode: "MANUEL" });
  }
  const feedCycleId = "cy-fy27";

  /* Missions (only those that have started by `now`) */
  const HOURS = [320, 180, 640, 260, 150, 520, 210, 760, 300, 240, 410, 180, 350, 90];
  const missions = MISSIONS.filter((m) => new Date(m[3] + "T00:00:00Z") <= new Date(now)).map(([id, name, description, start, end, lead, people]) => ({
    id,
    cycleId: feedCycleId,
    name,
    otp: `OTP-26-${String(140 + (parseInt(id.slice(2), 10) - 1) * 7).padStart(4, "0")}`,
    hours: HOURS[parseInt(id.slice(2), 10) - 1] ?? 200,
    description,
    startDate: start + "T00:00:00.000Z",
    endDate: end + "T00:00:00.000Z",
    leadId: uid(lead),
    status: new Date(end + "T23:59:59Z") < new Date(now) ? ("TERMINEE" as const) : ("EN_COURS" as const),
    participantIds: people.map(uid),
  }));

  /* Random feedback pool */
  type Cand = { mi: number; a: string; b: string; date: string };
  const cands: Cand[] = [];
  missions.forEach((m, mi) => {
    const winEnd = new Date(Math.min(new Date(now).getTime() - 86_400_000, new Date(m.endDate).getTime()));
    const winStart = new Date(m.startDate).getTime() + 5 * 86_400_000;
    if (winEnd.getTime() <= winStart) return;
    for (const a of m.participantIds)
      for (const b of m.participantIds) {
        if (a === b) continue;
        if (b === uid("lucas") || b === uid("karim")) continue; // Lucas is scripted
        for (let k = 0; k < 2; k++) {
          const t = winStart + rng() * (winEnd.getTime() - winStart);
          cands.push({ mi, a, b, date: new Date(t).toISOString() });
        }
      }
  });

  const named: NamedFeedback[] = [];
  const anonymous: AnonymousFeedback[] = [];
  let nId = 1;
  let aId = 1;

  const pushFeedback = (a: string, b: string, missionId: string | null, date: string, anonymousSend: boolean, over?: { profile?: Profile; ratings?: boolean; requestId?: string }) => {
    const author = userById.get(a)!;
    const recipient = userById.get(b)!;
    const mission = missions.find((m) => m.id === missionId);
    const profile = over?.profile ?? profiles.get(b)!;
    const answers = makeAnswers(rng, profile, mission?.name ?? null);
    const ratings = makeRatings(rng, profile, over?.ratings ?? rng() < 0.72);
    const relation = relationOf(author, recipient) ?? "PAIR";
    if (anonymousSend) {
      anonymous.push({ id: `fa-${aId++}`, cycleId: feedCycleId, missionId, recipientId: b, relation: settings.visibility.showRelationOnAnonymous ? relation : null, answers, ratings, createdAt: roundToDay(date) });
    } else {
      named.push({ id: `fn-${nId++}`, cycleId: feedCycleId, missionId, authorId: a, recipientId: b, relation, requestId: over?.requestId, answers, ratings, createdAt: date, status: "ENVOYE" });
    }
  };

  /* Scripted: Lucas Bernard (spec 7.3) */
  const L = uid("lucas");
  const lucasScript: Array<[string, string, string, boolean]> = [
    ["claire", "m-01", "2026-08-04T10:12:00.000Z", false],
    ["claire", "m-13", "2026-09-18T15:40:00.000Z", true],
    ["yanis", "m-06", "2026-10-14T09:25:00.000Z", false],
    ["thomas", "m-01", "2026-12-10T11:05:00.000Z", false],
    ["imane", "m-01", "2027-01-20T14:10:00.000Z", false],
    ["yanis", "m-06", "2027-02-15T09:00:00.000Z", true],
    ["djamel", "m-05", "2027-03-03T16:30:00.000Z", false],
    ["rachid", "m-06", "2027-04-12T10:45:00.000Z", false],
    ["thomas", "m-06", "2027-05-20T13:20:00.000Z", false],
  ];
  for (const [who, mid, date, anon] of lucasScript) {
    if (new Date(date) > new Date(now)) continue;
    if (!missions.some((m) => m.id === mid)) continue;
    pushFeedback(uid(who), L, mid, date, anon, { profile: profiles.get(L)!, ratings: true });
  }
  /* Scripted: Thomas receives one anonymous feedback from his team */
  if (scenario >= 2) pushFeedback(uid("imane"), uid("thomas"), "m-03", "2026-10-21T09:10:00.000Z", true, { ratings: true });
  /* Claire writes to Lucas in the demo, so make sure she has a past named feedback to others */

  /* Fill up to target from the pool */
  const target = TARGET_FEEDBACK[scenario];
  const pool = shuffle(rng, cands);
  for (const c of pool) {
    if (named.length + anonymous.length >= target) break;
    const anon = rng() < 0.25;
    // Keep the three "pending" demo requests honest: Claire's replies come through requests below.
    pushFeedback(c.a, c.b, missions[c.mi].id, c.date, anon);
  }
  named.sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  anonymous.sort((x, y) => x.createdAt.localeCompare(y.createdAt));

  /* Requests & tasks */
  const requests: AppState["requests"] = [];
  const tasks: PendingTask[] = [];
  let rId = 1;
  let tId = 1;
  const mkRequest = (requester: string, mission: string | null, recipients: string[], created: string, due: string, message: string, claim: Record<string, "pending" | "named" | "anon" | "declined" | "returned">, extra?: { role?: string; hours?: number }) => {
    if (mission && !missions.some((m) => m.id === mission)) return;
    const req: AppState["requests"][number] = { id: `rq-${rId++}`, cycleId: feedCycleId, missionId: mission, role: extra?.role, hours: extra?.hours, requesterId: uid(requester), recipientIds: recipients.map(uid), message, createdAt: created, dueDate: due, allowAnonymous: true, anonymousReplies: 0 };
    requests.push(req);
    for (const r of recipients) {
      const st = claim[r] ?? "pending";
      const status = st === "pending" ? "EN_ATTENTE" : st === "declined" ? "DECLINEE" : st === "returned" ? "RETOURNEE" : "TRAITEE";
      tasks.push({ id: `tk-${tId++}`, giverId: uid(r), requestId: req.id, status: status as PendingTask["status"], reason: st === "declined" ? "Je n’ai pas travaillé assez directement avec vous sur cette mission." : st === "returned" ? "Nous n’avons pas travaillé ensemble sur cette mission : je ne suis pas la bonne personne." : undefined });
      if (st === "named") pushFeedback(uid(r), uid(requester), mission, addDays(created, 2 + (tId % 4)), false, { requestId: req.id });
      if (st === "anon") {
        pushFeedback(uid(r), uid(requester), mission, addDays(created, 2 + (tId % 4)), true);
        req.anonymousReplies += 1;
      }
    }
  };
  if (scenario >= 2) {
    const d = (n: number) => addDays(now, n);
    // Claire's 3 pending requests, one due within 3 days
    mkRequest("yanis", "m-01", ["claire", "imane", "lucas"], d(-6), d(2), "Ton retour sur ma contribution au volet gouvernance m’aiderait beaucoup, merci.", { imane: "named", lucas: "pending" }, { role: "Cadrage et animation des ateliers du volet gouvernance.", hours: 64 });
    mkRequest("imane", "m-13", ["claire", "yanis"], d(-9), d(12), "Peux-tu me donner ton avis sur le diagnostic ? Merci d’avance.", { yanis: "named" }, { role: "Analyse documentaire et rédaction du diagnostic." });
    mkRequest("nadia", "m-06", ["claire", "thomas", "lucas"], d(-3), d(17), "J’aimerais avoir un retour sur mon travail de cartographie.", { thomas: "named" });
    // A few historic requests
    mkRequest("samir", "m-04", ["meriem", "imane", "nadia", "leila"], d(-20), d(-4), "Retour sur la phase d’audit terrain.", { meriem: "named", imane: "anon", nadia: "named", leila: "declined" });
    mkRequest("mehdi", "m-03", ["lina", "sarah", "amine"], d(-14), d(6), "Retour sur la conception du modèle de données.", { lina: "named", sarah: "anon" }, { role: "Conception du modèle de données et revue de l’architecture." });
    mkRequest("houda", "m-09", ["sophie", "imane", "soraya"], d(-10), d(9), "Retour sur l’animation des ateliers.", { sophie: "named" });
    // Post-contract: a request without mission, and one returned by its evaluator.
    mkRequest("nadia", null, ["sarah", "amine"], d(-5), d(9), "Un retour d’ensemble sur notre collaboration cette année m’aiderait.", {});
    mkRequest("mehdi", "m-03", ["amine", "lina"], d(-4), d(10), "Retour sur mon accompagnement de l’équipe.", { amine: "returned" }, { role: "Pilotage de la mission et suivi de l’équipe." });
  }
  named.sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  anonymous.sort((x, y) => x.createdAt.localeCompare(y.createdAt));

  /* Syntheses */
  const eligible = USERS.filter(([, , , , , , leader, role]) => leader && users.find((u) => u.id === uid(leader))?.role === "RESPONSABLE" && role !== "RESPONSABLE").map(([k]) => k);
  const synthKeys = eligible.filter((k) => !["soraya", "hind"].includes(k)).slice(0, 22);
  const syntheses: Synthesis[] = [];
  synthKeys.forEach((k, i) => {
    let status: Synthesis["status"] = "NON_COMMENCEE";
    if (scenario === 3) {
      // 9 validated, 6 in writing, 7 not started (deterministic by index), keep the demo cast fixed
      const order = ["claire", "meriem", "samir", "lina", "mehdi", "sarah", "anis", "leila", "yacine", "lucas", "yanis", "imane", "nadia", "kenza", "rania", "bilal", "djamel", "houda", "farid", "wafa", "nabil", "sophie"];
      const idx = order.indexOf(k);
      status = idx < 9 ? "VALIDEE" : idx < 15 ? "EN_REDACTION" : "NON_COMMENCEE";
    }
    if (scenario === 4) status = "VALIDEE";
    const strengths: Synthesis["strengths"] = [];
    const axes: Synthesis["axes"] = [];
    const prof = profiles.get(uid(k))!;
    const ranked = COMPETENCIES.map((c) => ({ c, v: prof[c.id] })).sort((a, b) => b.v - a.v);
    if (status !== "NON_COMMENCEE") {
      ranked.slice(0, 2).forEach((r, j) => strengths.push({ id: `s-${k}-${j}`, competencyId: r.c.id, text: STRENGTH_TEXT[r.c.id][0] }));
      ranked.slice(-1).forEach((r, j) => axes.push({ id: `a-${k}-${j}`, competencyId: r.c.id, text: AXIS_TEXT[r.c.id][0] }));
      if (status === "EN_REDACTION" && k !== "lucas") {
        axes.length = 0; // still being written
      }
      if (k === "lucas" && status === "EN_REDACTION") {
        strengths.length = 1;
        axes.length = 0;
      }
    }
    syntheses.push({
      id: `sy-fy27-${k}`,
      cycleId: feedCycleId,
      userId: uid(k),
      status,
      strengths,
      axes,
      aiSuggestions: [],
      validatedAt: status === "VALIDEE" ? addDays(now, -((i % 5) + 1)) : undefined,
    });
  });
  // FY26 archived syntheses (frozen snapshots) so "Évolution" works
  if (scenario >= 2) {
    synthKeys.forEach((k, i) => {
      const prof = profiles.get(uid(k))!;
      const prng = mulberry32(77 + i);
      const snap = COMPETENCIES.map((c) => {
        const delta = (prng() - 0.4) * 0.9;
        const avg = Math.max(1.8, Math.min(4.9, prof[c.id] - delta));
        return { competencyId: c.id, average: Math.round(avg * 10) / 10, ratingCount: 4 + Math.floor(prng() * 6), feedbackCount: 5 + Math.floor(prng() * 6) };
      });
      const ranked = [...snap].sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
      syntheses.push({
        id: `sy-fy26-${k}`,
        cycleId: "cy-fy26",
        userId: uid(k),
        status: "VALIDEE",
        strengths: ranked.slice(0, 2).map((r, j) => ({ id: `s26-${k}-${j}`, competencyId: r.competencyId, text: STRENGTH_TEXT[r.competencyId][0] })),
        axes: ranked.slice(-1).map((r, j) => ({ id: `a26-${k}-${j}`, competencyId: r.competencyId, text: AXIS_TEXT[r.competencyId][0] })),
        aiSuggestions: [],
        snapshot: snap,
        validatedAt: "2026-07-08T10:00:00.000Z",
      });
    });
  }

  /* Client links — ONE link per client (CDC 3.7) */
  const clientLinks: AppState["clientLinks"] = [];
  const clientResponses: AppState["clientResponses"] = [];
  if (scenario >= 2) {
    const q4 = ["qc-1", "qc-2", "qc-3", "qc-4"];
    const mk = (id: string, token: string, mission: string, by: string, client: string, company: string, email: string, title: string, expiresIn: number, createdAgo: number) =>
      clientLinks.push({ id, token, missionId: mission, createdById: uid(by), clientName: client, company, clientEmail: email, title, welcome: `Bonjour ${client.split(" ")[0]}, merci de prendre quelques minutes pour partager votre retour sur la mission.`, questionIds: q4, expiresAt: addDays(now, expiresIn), maxResponses: 1, status: expiresIn < 0 ? "EXPIRE" : "ACTIF", createdAt: addDays(now, -createdAgo) });
    // pending link (the one used by the demo bar "Ouvrir le lien client")
    mk("cl-1", "energie-7kq2", "m-01", "thomas", "Samia Ait-Ali", "Direction du groupe", "s.aitali@client-a.example", "Votre avis sur notre accompagnement — Schéma directeur de transformation", 3, 25);
    // already answered
    mk("cl-3", "energie-m3dk", "m-01", "thomas", "Mourad Kaddour", "Direction des opérations", "m.kaddour@client-a.example", "Votre avis sur notre accompagnement — Schéma directeur de transformation", 20, 22);
    mk("cl-4", "energie-p8rv", "m-01", "lucas", "Lilia Bensaïd", "Direction financière", "l.bensaid@client-a.example", "Votre avis sur notre accompagnement — Schéma directeur de transformation", 18, 20);
    // expired, unanswered
    mk("cl-2", "diag-4mx9", "m-13", "thomas", "Rachid Medjahed", "Groupe industriel", "r.medjahed@client-b.example", "Votre retour sur le diagnostic organisationnel", -10, 60);
    [
      ["cl-3", 5, -14, 0],
      ["cl-4", 4, -9, 1],
    ].forEach(([linkId, rating, offset, ci], i) => {
      const l = clientLinks.find((x) => x.id === linkId)!;
      clientResponses.push({ id: `cr-${i + 1}`, linkId: l.id, missionId: l.missionId, clientName: l.clientName, company: l.company, answers: { "qc-1": String(rating), "qc-2": String(rating), "qc-3": "5", "qc-4": CLIENT_COMMENTS[ci as number] }, rating: rating as number, createdAt: addDays(now, offset as number) });
    });
  }

  /* Notifications */
  const notifications: Notification[] = [];
  let nid = 1;
  const note = (userKey: string, kind: Notification["kind"], title: string, body: string, href: string, daysAgo: number, read = false) =>
    notifications.push({ id: `nt-${nid++}`, userId: uid(userKey), kind, title, body, href, createdAt: addDays(now, -daysAgo), read });
  if (scenario >= 2) {
    note("claire", "DEMANDE", "Nouvelle demande de feedback", "Yanis Benali vous demande un feedback sur « Schéma directeur de transformation ».", "/app/demandes", 6);
    note("claire", "DEMANDE", "Nouvelle demande de feedback", "Imane Haddad vous demande un feedback sur « Diagnostic organisationnel ».", "/app/demandes", 9, true);
    note("claire", "RAPPEL", "Rappel : demande bientôt échue", "La demande de Yanis Benali arrive à échéance dans 2 jours.", "/app/demandes", 0);
    note("lucas", "FEEDBACK", "Vous avez reçu un feedback", "Un feedback sur « Cartographie des risques » est disponible.", "/app/feedbacks", 25);
    note("lucas", "RAPPEL", "Votre objectif : 3 / 5", "Il vous manque 2 feedbacks, dont 1 de votre responsable ou de votre équipe.", "/app/accueil", 4);
    note("thomas", "FEEDBACK", "Nouveau feedback sur votre équipe", "Un feedback anonyme a été reçu pour l’un de vos collaborateurs.", "/app/equipe", 18);
    note("thomas", "RAPPEL", "2 collaborateurs sous l’objectif", "Nadia Cherif et Yanis Benali n’ont pas atteint leur objectif.", "/app/equipe", 2);
    note("thomas", "CLIENT", "Un lien client expire bientôt", "Le lien envoyé à Samia Ait-Ali (« Schéma directeur de transformation ») expire dans 3 jours.", "/app/feedback-client", 0);
    note("thomas", "CLIENT", "Retour client reçu", "Lilia Bensaïd (Direction financière) a répondu.", "/app/feedback-client", 9);
    note("sophie", "RAPPEL", "Retours obligatoires non réalisés", "Des profils juniors n’ont pas encore donné leur minimum de feedbacks.", "/app/suivi", 1);
    note("sophie", "RAPPEL", "6 collaborateurs sous l’objectif", "Vous pouvez envoyer un rappel depuis Suivi & rappels.", "/app/suivi", 3);
    note("sophie", "SYSTEME", "Sauvegarde quotidienne effectuée", "Une sauvegarde automatique a été créée ce matin.", "/app/parametres", 0, true);
    note("karim", "SYSTEME", "Sauvegarde quotidienne effectuée", "Taille : 412 Ko. Conservation : 90 jours.", "/app/parametres", 0);
  }
  if (scenario === 3) {
    note("thomas", "SYNTHESE", "Synthèses à rédiger", "Plusieurs synthèses de votre équipe sont en attente de rédaction.", "/app/syntheses", 1);
    note("sophie", "SYNTHESE", "Fin de cycle dans 20 jours", "Synthèses validées : 9 sur 22.", "/app/cycles", 1);
  }
  if (scenario === 1) {
    note("sophie", "SYSTEME", "Le cycle FY27 est ouvert", "Les collaborateurs peuvent demander et donner des feedbacks.", "/app/cycles", 5);
  }
  if (scenario === 4) {
    note("sophie", "SYSTEME", "Cycle FY27 archivé", "Le cycle FY28 est ouvert depuis hier.", "/app/cycles", 1);
    note("thomas", "SYNTHESE", "Cycle FY27 archivé", "Les synthèses de votre équipe sont consultables en lecture seule.", "/app/syntheses", 1);
  }

  /* Admin events (never feedback authorship) */
  const adminEvents: AdminEvent[] = [];
  let eid = 1;
  const ev = (daysAgo: number, actor: string | null, category: AdminEvent["category"], action: string, target: string, details?: AdminEvent["details"]) =>
    adminEvents.push({ id: `ev-${eid++}`, ts: addDays(now, -daysAgo), actorId: actor ? uid(actor) : null, category, action, target, details });
  ev(130, "sophie", "Cycles", "Cycle ouvert", "FY27");
  ev(128, "sophie", "Paramètres", "Règle de visibilité modifiée", "Auteur affiché sur les feedbacks nominatifs", { before: "Désactivé", after: "Activé" });
  ev(120, "sophie", "Questions", "Question modifiée", "Engagements et livraison", { before: "Comment cette personne tient-elle les délais ?", after: "Comment cette personne a-t-elle tenu ses engagements en matière de délais, de budget et de qualité ?" });
  ev(96, "sophie", "Missions", "Mission créée", "Schéma directeur de transformation — Secteur énergie");
  ev(70, "karim", "Sécurité", "Rôle attribué", "Amel Rezig → Responsable d’équipe", { before: "Collaborateur", after: "Responsable d’équipe" });
  ev(62, "sophie", "Collaborateurs", "Import de collaborateurs", "30 lignes importées, 0 erreur");
  ev(40, "sophie", "Liens client", "Lien client créé", "Schéma directeur de transformation");
  ev(33, "karim", "Sécurité", "Sauvegarde créée", "Sauvegarde manuelle");
  ev(15, "sophie", "Paramètres", "Quota modifié", "Feedbacks reçus minimum", { before: "4", after: "5" });
  ev(9, null, "Feedbacks", "Un feedback anonyme a été envoyé", "—");
  ev(4, null, "Feedbacks", "Un feedback anonyme a été envoyé", "—");
  ev(2, "sophie", "Cycles", "Rappel envoyé", "Écart à l’objectif — 11 destinataires");

  /* Backups */
  const backups = [3, 2, 1, 0].map((n, i) => ({ id: `bk-${i + 1}`, ts: addDays(now, -n * 3 - 1), sizeKb: 380 + i * 14, kind: (i === 0 ? "MANUELLE" : "AUTO") as "AUTO" | "MANUELLE" }));

  /* Email sends */
  const emailSends = [
    { id: "es-1", ts: addDays(now, -2), templateId: "t-rappel-objectif", recipients: 11, delivered: 11, opened: 8, audience: "Collaborateurs sous l’objectif" },
    { id: "es-2", ts: addDays(now, -8), templateId: "t-rappel-demande", recipients: 7, delivered: 7, opened: 6, audience: "Demandes en attente" },
    { id: "es-3", ts: addDays(now, -25), templateId: "t-client", recipients: 3, delivered: 3, opened: 2, audience: "Contacts client" },
    { id: "es-4", ts: addDays(now, -60), templateId: "t-demande", recipients: 29, delivered: 29, opened: 24, audience: "Tous les collaborateurs" },
  ];

  const state: AppState = {
    v: STATE_VERSION,
    scenario,
    now,
    session: { userId: sessionUserId },
    departments,
    users,
    cycles,
    missions,
    requests,
    tasks,
    competencies: COMPETENCIES.map((c, i) => ({ ...c, order: i + 1 })),
    questions,
    named,
    anonymous,
    syntheses,
    clientLinks,
    clientResponses,
    notifications,
    adminEvents,
    settings,
    templates: TEMPLATES,
    emailSends,
    backups,
    drafts: {},
    viewingCycleId: null,
    tourDone: {},
    clientDevices: [],
  };
  if (scenario === 4) freezeSnapshots(state, "cy-fy27");
  return state;
}

export function hashString(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
/** Stable per-user profile for runtime-simulated feedback. */
export function profileForUser(userId: string): Profile {
  const key = userId.replace(/^u-/, "");
  return profileFor(mulberry32(hashString(key)), key);
}

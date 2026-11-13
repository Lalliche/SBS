import { describe, expect, it } from "vitest";
import { average, can, clientLinkValidity, competencyStats, evolution, questionBankWarning, quotaProgress, relationOf } from "./engine";
import { buildSeed } from "./seed";
import { giveAnonymous, giveNamed, completeTaskAnonymously } from "./actions";
import { feedbackAbout, sentBy } from "./selectors";
import type { AppState } from "./types";

const seed = (n: 1 | 2 | 3 | 4 = 2): AppState => buildSeed(n);
const u = (s: AppState, k: string) => s.users.find((x) => x.id === `u-${k}`)!;

describe("engine rules", () => {
  it("RG-05: average ignores missing ratings and returns null without ratings", () => {
    expect(average([])).toBeNull();
    expect(average([4, 5, 3])).toBeCloseTo(4);
    expect(average([4, NaN as unknown as number, 0, 6])).toBe(4);
  });
  it("RG-06: stats expose no overall score field", () => {
    const s = seed();
    const stats = competencyStats(s.named.slice(0, 20), s.competencies);
    expect(stats).toHaveLength(6);
    expect(Object.keys(stats[0]).sort()).toEqual(["average", "competencyId", "feedbackCount", "ratingCount"]);
  });
  it("RG-02: relation derivation", () => {
    const s = seed();
    expect(relationOf(u(s, "thomas"), u(s, "lucas"))).toBe("RESPONSABLE");
    expect(relationOf(u(s, "lucas"), u(s, "thomas"))).toBe("EQUIPE");
    expect(relationOf(u(s, "lucas"), u(s, "claire"))).toBe("PAIR");
    expect(relationOf(u(s, "lucas"), u(s, "lucas"))).toBeNull();
  });
  it("evolution needs both values", () => {
    expect(evolution(4, null)).toBeNull();
    expect(evolution(4.2, 3.9)).toBeCloseTo(0.3);
  });
  it("question bank warning outside 5–8", () => {
    const s = seed();
    expect(questionBankWarning(s.questions)).toBeNull();
    expect(questionBankWarning(s.questions.filter((q) => q.kind === "COLLAB").slice(0, 3))).toMatch(/au moins 5/);
  });
  it("Lucas ring is 3 / 5 in scenario 2 and 9 feedbacks at end of cycle", () => {
    const s2 = seed(2);
    const q = quotaProgress({ user: u(s2, "lucas"), users: s2.users, named: s2.named, anonymous: s2.anonymous, rule: s2.cycles[1].quotaRule, tasks: s2.tasks, anonymousCounts: true, cycleProgress: 0.4 });
    expect(q.received).toBe(3);
    expect(q.missing).toBe(2);
    expect(q.missingDirect).toBe(1);
    const s3 = seed(3);
    const n = s3.named.filter((f) => f.recipientId === "u-lucas").length + s3.anonymous.filter((f) => f.recipientId === "u-lucas").length;
    expect(n).toBe(9);
    expect(s3.anonymous.filter((f) => f.recipientId === "u-lucas")).toHaveLength(2);
  });
  it("client link validity", () => {
    const s = seed();
    const link = s.clientLinks[0];
    expect(clientLinkValidity(link, s.clientResponses, s.now)).toBe("OK");
    expect(clientLinkValidity(s.clientLinks.find((l) => l.id === "cl-2")!, s.clientResponses, s.now)).toBe("EXPIRE");
    // one link = one client = one answer: an answered link is complete
    expect(clientLinkValidity(s.clientLinks.find((l) => l.id === "cl-3")!, s.clientResponses, s.now)).toBe("MAX_ATTEINT");
    expect(clientLinkValidity({ ...link, status: "DESACTIVE" }, s.clientResponses, s.now)).toBe("DESACTIVE");
  });
  it("CDC 3.7: every client link names one client and each answered link carries that client", () => {
    const s = seed();
    for (const l of s.clientLinks) {
      expect(l.clientName).toBeTruthy();
      expect(l.clientEmail).toContain("@");
      expect(l.maxResponses).toBe(1);
    }
    for (const r of s.clientResponses) {
      const l = s.clientLinks.find((x) => x.id === r.linkId)!;
      expect(r.clientName).toBe(l.clientName);
    }
  });
  it("CDC 3.1: HR cannot manage missions; responsables can; HR cannot send client links", () => {
    const s = seed();
    expect(can(u(s, "sophie"), "mission.create")).toBe(false);
    expect(can(u(s, "thomas"), "mission.create")).toBe(true);
    expect(can(u(s, "sophie"), "clientlink.manage")).toBe(false);
    expect(can(u(s, "lucas"), "clientlink.manage")).toBe(true);
    expect(s.missions.every((m) => s.users.find((x) => x.id === m.leadId)!.role !== "ADMIN_RH")).toBe(true);
    expect(s.missions.every((m) => /^OTP-/.test(m.otp) && m.hours > 0)).toBe(true);
  });
  it("CDC 3.10 / 3.5: given count and mandatory feedback for juniors", () => {
    const s = seed();
    const rule = s.cycles[1].quotaRule;
    const args = { users: s.users, named: s.named, anonymous: s.anonymous, tasks: s.tasks, rule, anonymousCounts: true, cycleProgress: 0.4 };
    const junior = quotaProgress({ ...args, user: u(s, "nadia") });
    expect(junior.mandatory).toBe(true);
    expect(junior.minGiven).toBe(3);
    expect(junior.given).toBeGreaterThanOrEqual(0);
    expect(quotaProgress({ ...args, user: u(s, "lucas") }).mandatory).toBe(false);
  });
  it("scenario 3 has 22 syntheses: 9 validated, 6 in writing, 7 not started", () => {
    const s = seed(3);
    const cur = s.syntheses.filter((x) => x.cycleId === "cy-fy27");
    expect(cur).toHaveLength(22);
    expect(cur.filter((x) => x.status === "VALIDEE")).toHaveLength(9);
    expect(cur.filter((x) => x.status === "EN_REDACTION")).toHaveLength(6);
    expect(cur.filter((x) => x.status === "NON_COMMENCEE")).toHaveLength(7);
  });
});

/* ---- Anonymity (spec 7.2.6): no author-like field, no selector can derive one ---- */
const AUTHOR_LIKE = /author|giver|sender|from|writer|by|requestid|userid/i;

describe("anonymity guarantees", () => {
  it("seed anonymous records carry no author-like field", () => {
    for (const n of [1, 2, 3, 4] as const) {
      const s = seed(n);
      for (const f of s.anonymous) {
        expect(Object.keys(f).filter((k) => AUTHOR_LIKE.test(k))).toEqual([]);
      }
    }
  });
  it("giveAnonymous stores no author-like field and its payload type has no author", () => {
    const s = seed();
    const before = s.anonymous.length;
    giveAnonymous(s, { recipientId: "u-lucas", missionId: "m-01", relation: "PAIR", answers: { "q-1": "x" }, ratings: {} });
    expect(s.anonymous).toHaveLength(before + 1);
    const rec = s.anonymous[s.anonymous.length - 1];
    expect(Object.keys(rec).filter((k) => AUTHOR_LIKE.test(k))).toEqual([]);
    expect(rec.createdAt.endsWith("T00:00:00.000Z")).toBe(true); // rounded to the day
  });
  it("admin journal records the anonymous send without an actor", () => {
    const s = seed();
    giveAnonymous(s, { recipientId: "u-lucas", missionId: null, relation: null, answers: {}, ratings: {} });
    const e = s.adminEvents[0];
    expect(e.action).toMatch(/anonyme/i);
    expect(e.actorId).toBeNull();
  });
  it("an anonymous send never appears in the sender's 'Envoyés' and views have no author", () => {
    const s = seed();
    const sentBefore = sentBy(s, "u-claire", "cy-fy27").length;
    giveAnonymous(s, { recipientId: "u-lucas", missionId: "m-01", relation: "PAIR", answers: {}, ratings: {} });
    completeTaskAnonymously(s, "u-claire", s.requests[0].id);
    expect(sentBy(s, "u-claire", "cy-fy27")).toHaveLength(sentBefore);
    const views = feedbackAbout(s, "u-lucas", "cy-fy27", "u-lucas").filter((v) => v.kind === "ANONYME");
    expect(views.length).toBeGreaterThan(0);
    for (const v of views) expect(v.author).toBeUndefined();
  });
  it("named sends are attributable to their author (control)", () => {
    const s = seed();
    giveNamed(s, { authorId: "u-claire", recipientId: "u-lucas", missionId: "m-01", relation: "PAIR", answers: {}, ratings: {} });
    expect(sentBy(s, "u-claire", "cy-fy27")[0].recipientId).toBe("u-lucas");
  });
  it("persisted state JSON has no author-like key inside the anonymous collection", () => {
    const s = seed(3);
    const json = JSON.parse(JSON.stringify(s.anonymous)) as Array<Record<string, unknown>>;
    json.forEach((r) => expect(Object.keys(r).some((k) => AUTHOR_LIKE.test(k))).toBe(false));
  });
});

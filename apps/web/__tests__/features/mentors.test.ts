/**
 * @jest-environment node
 */
import { toEvaluationDTO } from "@/features/mentor/server/dto";
import {
  MAX_COMMENT_LENGTH,
  RUBRIC,
  evaluationAverage,
  mentorNameError,
  parseEvaluationBody,
  readScores,
  summarizeEvaluations,
} from "@/features/mentor/server/rubric";
import {
  createMentorSession,
  createPlayerSession,
  verifyMentorSession,
  verifyPlayerSession,
} from "@/lib/auth/session";

const allFours = Object.fromEntries(RUBRIC.map((id) => [id, 4]));

describe("parseEvaluationBody", () => {
  it("accepts every criterion from 1 to 5 and trims the comment", () => {
    expect(
      parseEvaluationBody({ scores: allFours, comment: "  buen pitch  " }),
    ).toEqual({ ok: true, data: { scores: allFours, comment: "buen pitch" } });
    expect(parseEvaluationBody({ scores: allFours, comment: "   " })).toEqual({
      ok: true,
      data: { scores: allFours, comment: null },
    });
  });

  it("requires every criterion", () => {
    const rest = { ...allFours };
    delete rest.impacto;
    expect(parseEvaluationBody({ scores: rest })).toEqual({
      ok: false,
      fields: { "scores.impacto": "REQUIRED" },
    });
    expect(parseEvaluationBody({})).toEqual({
      ok: false,
      fields: { scores: "REQUIRED" },
    });
  });

  it("rejects scores out of range, decimals and unknown criteria", () => {
    for (const bad of [0, 6, 3.5, "4"]) {
      const result = parseEvaluationBody({
        scores: { ...allFours, problema: bad },
      });
      expect(result).toEqual({
        ok: false,
        fields: { "scores.problema": "INVALID" },
      });
    }
    expect(parseEvaluationBody({ scores: { ...allFours, extra: 3 } })).toEqual({
      ok: false,
      fields: { scores: "UNKNOWN_CRITERION" },
    });
  });

  it("rejects a comment that is too long", () => {
    expect(
      parseEvaluationBody({
        scores: allFours,
        comment: "a".repeat(MAX_COMMENT_LENGTH + 1),
      }),
    ).toEqual({ ok: false, fields: { comment: "TOO_LONG" } });
  });
});

describe("mentorNameError", () => {
  it("requires a short name", () => {
    expect(mentorNameError("Dra. López")).toBe(null);
    expect(mentorNameError("  ")).toBe("REQUIRED");
    expect(mentorNameError(undefined)).toBe("REQUIRED");
    expect(mentorNameError("x".repeat(41))).toBe("TOO_LONG");
  });
});

describe("scores and summaries", () => {
  it("reads old or broken JSON safely", () => {
    expect(readScores({ problema: 5, viejo: 2 })).toEqual({ problema: 5 });
    expect(readScores(null)).toEqual({});
    expect(readScores([1, 2])).toEqual({});
  });

  it("averages one evaluation with two decimals", () => {
    expect(
      evaluationAverage({
        problema: 5,
        solucao: 4,
        impacto: 4,
        viabilidade: 3,
        apresentacao: 5,
      }),
    ).toBe(4.2);
    expect(evaluationAverage({})).toBe(null);
  });

  it("summarizes a team's evaluations", () => {
    const summary = summarizeEvaluations([
      { scores: allFours },
      { scores: { ...allFours, problema: 5, solucao: 5 } },
    ]);
    expect(summary).toEqual({
      count: 2,
      average: 4.2,
      byCriterion: {
        problema: 4.5,
        solucao: 4.5,
        impacto: 4,
        viabilidade: 4,
        apresentacao: 4,
      },
    });
    expect(summarizeEvaluations([])).toEqual({
      count: 0,
      average: null,
      byCriterion: {},
    });
  });

  it("builds the evaluation DTO", () => {
    expect(
      toEvaluationDTO({
        teamId: "t1",
        scores: allFours,
        comment: null,
        updatedAt: new Date("2026-11-13T10:00:00Z"),
      }),
    ).toEqual({
      teamId: "t1",
      scores: allFours,
      average: 4,
      comment: null,
      updatedAt: "2026-11-13T10:00:00.000Z",
    });
  });
});

describe("mentor session", () => {
  const savedSecret = process.env.AUTH_SECRET;
  beforeAll(() => {
    process.env.AUTH_SECRET = "s".repeat(32);
  });
  afterAll(() => {
    process.env.AUTH_SECRET = savedSecret;
  });

  it("round-trips mentor and event", async () => {
    const token = await createMentorSession({ mentorId: "m1", eventId: "e1" });
    expect(await verifyMentorSession(token)).toEqual({
      mentorId: "m1",
      eventId: "e1",
    });
  });

  it("does not accept a player token as a mentor one, or the reverse", async () => {
    const player = await createPlayerSession({
      participantId: "p1",
      teamId: "t1",
      eventId: "e1",
    });
    const mentor = await createMentorSession({ mentorId: "m1", eventId: "e1" });
    expect(await verifyMentorSession(player)).toBe(null);
    expect(await verifyPlayerSession(mentor)).toBe(null);
  });
});

// Rubric and rules for mentor grading. Pure functions (no database access)
// so they can be unit-tested. The rubric is a default while the team
// decides: changing RUBRIC is enough, scores are stored as JSON.

// Criterion ids are API values; the frontend translates them
// (mentor.criteria.<id>).
export const RUBRIC = [
  "problema", // understanding of the problem
  "solucao", // quality of the solution
  "impacto", // social impact
  "viabilidade", // feasibility / business model
  "apresentacao", // pitch and delivery
] as const;
export type CriterionId = (typeof RUBRIC)[number];
export type Scores = Record<CriterionId, number>;

export const MIN_SCORE = 1;
export const MAX_SCORE = 5;
export const MAX_COMMENT_LENGTH = 2000;
export const MAX_MENTOR_NAME_LENGTH = 40;
export const MAX_MENTORS_PER_EVENT = 50;

export function mentorNameError(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return "REQUIRED";
  if (value.trim().length > MAX_MENTOR_NAME_LENGTH) return "TOO_LONG";
  return null;
}

// Body of PUT /api/mentor/evaluations/:teamId: { scores, comment? }. Every
// criterion is required, as an integer from 1 to 5.
export function parseEvaluationBody(
  body: Record<string, unknown>,
):
  | { ok: true; data: { scores: Scores; comment: string | null } }
  | { ok: false; fields: Record<string, string> } {
  const fields: Record<string, string> = {};

  const raw = body.scores;
  const scores = {} as Scores;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fields.scores = "REQUIRED";
  } else {
    const given = raw as Record<string, unknown>;
    for (const id of RUBRIC) {
      const value = given[id];
      if (value === undefined || value === null) {
        fields[`scores.${id}`] = "REQUIRED";
      } else if (
        typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < MIN_SCORE ||
        value > MAX_SCORE
      ) {
        fields[`scores.${id}`] = "INVALID";
      } else {
        scores[id] = value;
      }
    }
    if (Object.keys(given).some((id) => !RUBRIC.includes(id as CriterionId))) {
      fields.scores = "UNKNOWN_CRITERION";
    }
  }

  let comment: string | null = null;
  if (typeof body.comment === "string" && body.comment.trim()) {
    comment = body.comment.trim();
    if (comment.length > MAX_COMMENT_LENGTH) fields.comment = "TOO_LONG";
  }

  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, data: { scores, comment } };
}

const round2 = (value: number) => Math.round(value * 100) / 100;

// Reads scores saved under an older rubric safely: unknown criteria are
// ignored and missing ones simply do not count.
export function readScores(value: unknown): Partial<Scores> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const scores: Partial<Scores> = {};
  for (const id of RUBRIC) {
    const score = (value as Record<string, unknown>)[id];
    if (typeof score === "number") scores[id] = score;
  }
  return scores;
}

// Average of one evaluation across criteria (1-5, two decimals).
export function evaluationAverage(scores: Partial<Scores>): number | null {
  const values = Object.values(scores);
  if (values.length === 0) return null;
  return round2(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export type EvaluationSummary = {
  count: number;
  // Mean of the evaluations' averages; null until someone grades the team.
  average: number | null;
  byCriterion: Partial<Record<CriterionId, number>>;
};

export function summarizeEvaluations(
  evaluations: { scores: unknown }[],
): EvaluationSummary {
  const parsed = evaluations.map((e) => readScores(e.scores));
  const averages = parsed
    .map(evaluationAverage)
    .filter((a): a is number => a !== null);

  const byCriterion: Partial<Record<CriterionId, number>> = {};
  for (const id of RUBRIC) {
    const values = parsed
      .map((s) => s[id])
      .filter((v): v is number => v !== undefined);
    if (values.length > 0) {
      byCriterion[id] = round2(
        values.reduce((sum, v) => sum + v, 0) / values.length,
      );
    }
  }

  return {
    count: evaluations.length,
    average:
      averages.length > 0
        ? round2(averages.reduce((sum, v) => sum + v, 0) / averages.length)
        : null,
    byCriterion,
  };
}

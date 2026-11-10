import type { Evaluation } from "@tdoe/db";

import { evaluationAverage, readScores, type Scores } from "./rubric";

// Response shape for one mentor's evaluation of one team.

export type EvaluationDTO = {
  teamId: string;
  scores: Partial<Scores>;
  // Mean of the criteria (1-5, two decimals).
  average: number | null;
  comment: string | null;
  updatedAt: string;
};

export function toEvaluationDTO(
  evaluation: Pick<Evaluation, "teamId" | "scores" | "comment" | "updatedAt">,
): EvaluationDTO {
  const scores = readScores(evaluation.scores);
  return {
    teamId: evaluation.teamId,
    scores,
    average: evaluationAverage(scores),
    comment: evaluation.comment,
    updatedAt: evaluation.updatedAt.toISOString(),
  };
}

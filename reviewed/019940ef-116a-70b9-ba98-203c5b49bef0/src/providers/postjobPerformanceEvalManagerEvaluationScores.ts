import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationScore";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Create a new evaluation score record.
 *
 * Creates a job performance evaluation score record linked to a specific
 * evaluation. Requires evaluation ID, category, and score values within
 * accepted scales.
 *
 * Access is restricted to authenticated manager users.
 *
 * @param props - Object containing manager payload and evaluation score
 *   creation data
 * @param props.manager - Authenticated manager making the request
 * @param props.body - Data required to create an evaluation score record,
 *   excluding audit fields
 * @returns The full created evaluation score record with audit timestamps
 * @throws {Error} Throws if creation fails due to invalid input or database
 *   error
 */
export async function postjobPerformanceEvalManagerEvaluationScores(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalEvaluationScore.ICreate;
}): Promise<IJobPerformanceEvalEvaluationScore> {
  const { manager, body } = props;

  const id = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.job_performance_eval_evaluation_scores.create({
      data: {
        id,
        evaluation_id: body.evaluation_id,
        category: body.category,
        score: body.score,
      },
    });

  return {
    id: created.id,
    evaluation_id: created.evaluation_id,
    category: created.category,
    score: created.score,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}

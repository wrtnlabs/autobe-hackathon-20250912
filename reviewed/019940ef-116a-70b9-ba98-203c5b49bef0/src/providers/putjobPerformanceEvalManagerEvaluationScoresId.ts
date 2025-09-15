import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationScore";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Update an existing evaluation score record by its unique ID.
 *
 * This function updates the 'category' and 'score' fields of the evaluation
 * score, identified by the given ID, ensuring only authorized 'manager' role
 * can perform this operation.
 *
 * @param props - The parameters including authenticated manager, record ID, and
 *   update body
 * @returns The updated evaluation score record, with all required fields
 *   including timestamps.
 * @throws {Error} If the evaluation score record does not exist
 */
export async function putjobPerformanceEvalManagerEvaluationScoresId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalEvaluationScore.IUpdate;
}): Promise<IJobPerformanceEvalEvaluationScore> {
  const { manager, id, body } = props;

  // Check if the evaluation score record exists
  const existing =
    await MyGlobal.prisma.job_performance_eval_evaluation_scores.findUnique({
      where: { id },
    });
  if (!existing) throw new Error("Evaluation score record not found");

  // Prepare update data using only non-null and defined fields
  const data = {
    ...(body.category !== undefined && body.category !== null
      ? { category: body.category }
      : {}),
    ...(body.score !== undefined && body.score !== null
      ? { score: body.score }
      : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  // Perform the update
  const updated =
    await MyGlobal.prisma.job_performance_eval_evaluation_scores.update({
      where: { id },
      data,
    });

  // Return the updated record with ISO string dates
  return {
    id: updated.id,
    evaluation_id: updated.evaluation_id,
    category: updated.category,
    score: updated.score,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}

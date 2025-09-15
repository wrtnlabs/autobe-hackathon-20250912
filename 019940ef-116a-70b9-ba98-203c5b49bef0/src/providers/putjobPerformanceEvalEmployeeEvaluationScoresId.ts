import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationScore";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Update evaluation score record by ID
 *
 * This function updates an existing job performance evaluation score record
 * identified by its UUID. It allows modification of the category and score
 * fields while preserving the immutable evaluation_id. Access is restricted to
 * the owning employee for authorization.
 *
 * @param props - Object containing employee payload, score record ID, and
 *   update body
 * @param props.employee - Authenticated employee performing the update
 * @param props.id - UUID of the evaluation score record to update
 * @param props.body - Partial update payload for category and score fields
 * @returns The updated evaluation score record including audit timestamps
 * @throws {Error} If the evaluation score does not exist
 * @throws {Error} If the employee is unauthorized to perform this update
 */
export async function putjobPerformanceEvalEmployeeEvaluationScoresId(props: {
  employee: EmployeePayload;
  id: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalEvaluationScore.IUpdate;
}): Promise<IJobPerformanceEvalEvaluationScore> {
  const { employee, id, body } = props;

  // Retrieve existing evaluation score with related evaluation for authorization
  const existing =
    await MyGlobal.prisma.job_performance_eval_evaluation_scores.findUniqueOrThrow(
      {
        where: { id },
        include: {
          evaluation: {
            select: {
              employee_id: true,
            },
          },
        },
      },
    );

  // Authorization check: only owning employee can update
  if (existing.evaluation.employee_id !== employee.id) {
    throw new Error("Unauthorized");
  }

  // Build update data skipping null fields for required schema
  const data: {
    category?: string;
    score?: number;
  } = {};
  if (body.category !== undefined && body.category !== null) {
    data.category = body.category;
  }
  if (body.score !== undefined && body.score !== null) {
    data.score = body.score;
  }

  // Perform update
  const updated =
    await MyGlobal.prisma.job_performance_eval_evaluation_scores.update({
      where: { id },
      data,
    });

  // Return the updated record with ISO string date conversions
  return {
    id: updated.id,
    evaluation_id: updated.evaluation_id,
    category: updated.category,
    score: updated.score,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}

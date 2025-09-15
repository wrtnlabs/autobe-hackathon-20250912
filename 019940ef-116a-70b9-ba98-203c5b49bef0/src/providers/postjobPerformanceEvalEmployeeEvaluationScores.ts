import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEvaluationScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationScore";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Create a new job performance evaluation score record.
 *
 * This operation creates a record linked to a specific evaluation via
 * evaluation_id. The category and score fields are required, with score
 * expected to be an integer 1-5. The audit fields created_at and updated_at are
 * automatically managed.
 *
 * @param props - Request properties
 * @param props.employee - The authenticated employee making the request
 * @param props.body - Payload to create a new evaluation score record
 * @returns The newly created evaluation score record with all properties
 *   including audit timestamps
 * @throws {Error} When the creation fails due to invalid input or database
 *   errors
 */
export async function postjobPerformanceEvalEmployeeEvaluationScores(props: {
  employee: EmployeePayload;
  body: IJobPerformanceEvalEvaluationScore.ICreate;
}): Promise<IJobPerformanceEvalEvaluationScore> {
  const { employee, body } = props;

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.job_performance_eval_evaluation_scores.create({
      data: {
        id,
        evaluation_id: body.evaluation_id,
        category: body.category,
        score: body.score,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id as string & tags.Format<"uuid">,
    evaluation_id: created.evaluation_id as string & tags.Format<"uuid">,
    category: created.category,
    score: created.score,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}

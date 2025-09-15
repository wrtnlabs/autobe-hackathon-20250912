import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Deletes a job performance evaluation score by its unique ID.
 *
 * This operation permanently removes the evaluation score record from the
 * database. Only an authenticated employee can delete their own evaluation
 * scores.
 *
 * @param props - Object containing employee authentication payload and
 *   evaluation score ID
 * @param props.employee - The authenticated employee making the request
 * @param props.id - UUID of the evaluation score to delete
 * @returns Void
 * @throws {Error} When evaluation score does not exist
 * @throws {Error} When the evaluation score does not belong to the employee
 */
export async function deletejobPerformanceEvalEmployeeEvaluationScoresId(props: {
  employee: EmployeePayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { employee, id } = props;

  const score =
    await MyGlobal.prisma.job_performance_eval_evaluation_scores.findUnique({
      where: { id },
    });
  if (!score) throw new Error(`Evaluation score with id ${id} not found`);

  const evaluation =
    await MyGlobal.prisma.job_performance_eval_self_evaluations.findUnique({
      where: { id: score.evaluation_id },
    });
  if (!evaluation)
    throw new Error(`Evaluation not found for evaluation score ${id}`);

  if (evaluation.employee_id !== employee.id) {
    throw new Error(`Unauthorized: Not your evaluation score to delete`);
  }

  await MyGlobal.prisma.job_performance_eval_evaluation_scores.delete({
    where: { id },
  });
}

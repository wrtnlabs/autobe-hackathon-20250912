import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Updates an existing self-evaluation record by its unique ID.
 *
 * @param props - The function parameters including the authenticated employee,
 *   the ID of the self-evaluation to update, and the update fields.
 * @returns The updated self-evaluation record with all fields as specified in
 *   the API contract.
 * @throws {Error} If the self-evaluation record is not found or if the employee
 *   making the request does not own the record.
 */
export async function putjobPerformanceEvalEmployeeSelfEvaluationsId(props: {
  employee: EmployeePayload;
  id: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalSelfEvaluation.IUpdate;
}): Promise<IJobPerformanceEvalSelfEvaluation> {
  const { employee, id, body } = props;

  // Retrieve the existing self-evaluation record
  const existing =
    await MyGlobal.prisma.job_performance_eval_self_evaluations.findUnique({
      where: { id },
    });

  if (existing === null) {
    throw new Error("Self-evaluation record not found");
  }

  if (existing.employee_id !== employee.id) {
    throw new Error(
      "Unauthorized: You can only update your own self-evaluation",
    );
  }

  const now = toISOStringSafe(new Date());

  // Prepare the update data based on provided fields
  const updateData: IJobPerformanceEvalSelfEvaluation.IUpdate = {
    ...(body.evaluation_cycle_id !== undefined
      ? { evaluation_cycle_id: body.evaluation_cycle_id }
      : {}),
    ...(body.evaluation_date !== undefined
      ? { evaluation_date: body.evaluation_date }
      : {}),
    ...(body.work_performance_score !== undefined
      ? { work_performance_score: body.work_performance_score }
      : {}),
    ...(body.knowledge_skill_score !== undefined
      ? { knowledge_skill_score: body.knowledge_skill_score }
      : {}),
    ...(body.problem_solving_collab_score !== undefined
      ? { problem_solving_collab_score: body.problem_solving_collab_score }
      : {}),
    ...(body.innovation_score !== undefined
      ? { innovation_score: body.innovation_score }
      : {}),
    ...(body.overall_comment !== undefined
      ? { overall_comment: body.overall_comment }
      : {}),
  };

  // Update the record
  const updated =
    await MyGlobal.prisma.job_performance_eval_self_evaluations.update({
      where: { id },
      data: {
        ...updateData,
        updated_at: now,
      },
    });

  // Return the updated record with date-time fields converted
  return {
    id: updated.id,
    employee_id: updated.employee_id,
    evaluation_cycle_id: updated.evaluation_cycle_id,
    evaluation_date: toISOStringSafe(updated.evaluation_date),
    work_performance_score: updated.work_performance_score,
    knowledge_skill_score: updated.knowledge_skill_score,
    problem_solving_collab_score: updated.problem_solving_collab_score,
    innovation_score: updated.innovation_score,
    overall_comment: updated.overall_comment,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

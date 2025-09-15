import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalManagerEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerEvaluation";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Update a manager evaluation by its unique ID.
 *
 * This operation updates an existing manager evaluation record, allowing a
 * manager to modify evaluation scores and the overall comment. Authorization is
 * enforced: only the manager who owns the evaluation can update it.
 *
 * @param props - Object containing the authenticated manager, evaluation ID,
 *   and update data.
 * @param props.manager - Authenticated manager performing the update.
 * @param props.id - UUID of the manager evaluation record to update.
 * @param props.body - Partial update data conforming to
 *   IJobPerformanceEvalManagerEvaluation.IUpdate.
 * @returns The updated manager evaluation record with all fields.
 * @throws {Error} When the manager evaluation with the specified ID does not
 *   exist.
 * @throws {Error} When the authenticated manager is not authorized to update
 *   this record.
 */
export async function putjobPerformanceEvalManagerManagerEvaluationsId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalManagerEvaluation.IUpdate;
}): Promise<IJobPerformanceEvalManagerEvaluation> {
  const { manager, id, body } = props;

  // Retrieve the existing manager evaluation record or throw if not found
  const evaluation =
    await MyGlobal.prisma.job_performance_eval_manager_evaluations.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  // Authorization check to ensure the manager owns the evaluation
  if (evaluation.manager_id !== manager.id) {
    throw new Error("Unauthorized: You can only update your own evaluations.");
  }

  // Prepare the update data by including only defined fields from body
  const updateData: IJobPerformanceEvalManagerEvaluation.IUpdate = {
    manager_id: body.manager_id ?? undefined,
    employee_id: body.employee_id ?? undefined,
    evaluation_cycle_id: body.evaluation_cycle_id ?? undefined,
    evaluation_date: body.evaluation_date ?? undefined,
    work_performance_score: body.work_performance_score ?? undefined,
    knowledge_skill_score: body.knowledge_skill_score ?? undefined,
    problem_solving_collab_score:
      body.problem_solving_collab_score ?? undefined,
    innovation_score: body.innovation_score ?? undefined,
    overall_comment: body.overall_comment ?? undefined,
    deleted_at: body.deleted_at === undefined ? undefined : body.deleted_at,
    updated_at: toISOStringSafe(new Date()),
  };

  // Perform the update operation
  const updated =
    await MyGlobal.prisma.job_performance_eval_manager_evaluations.update({
      where: { id },
      data: updateData,
    });

  // Return updated manager evaluation record with date fields converted to ISO strings
  return {
    id: updated.id,
    manager_id: updated.manager_id,
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

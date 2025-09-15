import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalManagerEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerEvaluation";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Create a new manager evaluation entry with scores and comments for an
 * employee within a specific evaluation cycle.
 *
 * This operation is restricted to authenticated users with the manager role.
 *
 * @param props - Object containing the authenticated manager and the evaluation
 *   data to create
 * @param props.manager - Authenticated manager performing the evaluation
 * @param props.body - The payload containing evaluation scores and comments
 * @returns The newly created manager evaluation record, including timestamps
 * @throws {Error} If the creation fails due to database or validation errors
 */
export async function postjobPerformanceEvalManagerManagerEvaluations(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalManagerEvaluation.ICreate;
}): Promise<IJobPerformanceEvalManagerEvaluation> {
  const { manager, body } = props;

  // Use a single timestamp for created_at and updated_at
  const now = toISOStringSafe(new Date());

  // Create new manager evaluation record
  const created =
    await MyGlobal.prisma.job_performance_eval_manager_evaluations.create({
      data: {
        id: v4(),
        manager_id: body.manager_id,
        employee_id: body.employee_id,
        evaluation_cycle_id: body.evaluation_cycle_id,
        evaluation_date: body.evaluation_date,
        work_performance_score: body.work_performance_score,
        knowledge_skill_score: body.knowledge_skill_score,
        problem_solving_collab_score: body.problem_solving_collab_score,
        innovation_score: body.innovation_score,
        overall_comment: body.overall_comment,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Return the created record with proper date conversions
  return {
    id: created.id,
    manager_id: created.manager_id,
    employee_id: created.employee_id,
    evaluation_cycle_id: created.evaluation_cycle_id,
    evaluation_date: created.evaluation_date,
    work_performance_score: created.work_performance_score,
    knowledge_skill_score: created.knowledge_skill_score,
    problem_solving_collab_score: created.problem_solving_collab_score,
    innovation_score: created.innovation_score,
    overall_comment: created.overall_comment,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}

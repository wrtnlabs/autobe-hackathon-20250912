import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Retrieves detailed information about a specific self-evaluation submitted by
 * an employee.
 *
 * This operation fetches the complete data of the self-evaluation identified by
 * the unique ID. It includes category scores, comments, creation and update
 * timestamps, and soft-delete information. Only authorized manager users can
 * perform this operation.
 *
 * @param props - Object containing manager authentication and self-evaluation
 *   ID
 * @returns Detailed self-evaluation entity conforming to
 *   IJobPerformanceEvalSelfEvaluation
 * @throws {Error} When the self-evaluation with the specified ID is not found
 */
export async function getjobPerformanceEvalManagerSelfEvaluationsId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalSelfEvaluation> {
  const { id } = props;

  const found =
    await MyGlobal.prisma.job_performance_eval_self_evaluations.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  return {
    id: found.id,
    employee_id: found.employee_id,
    evaluation_cycle_id: found.evaluation_cycle_id,
    evaluation_date: toISOStringSafe(found.evaluation_date),
    work_performance_score: found.work_performance_score,
    knowledge_skill_score: found.knowledge_skill_score,
    problem_solving_collab_score: found.problem_solving_collab_score,
    innovation_score: found.innovation_score,
    overall_comment: found.overall_comment,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}

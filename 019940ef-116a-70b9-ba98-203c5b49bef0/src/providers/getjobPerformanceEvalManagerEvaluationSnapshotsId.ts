import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEvaluationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationSnapshot";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Retrieve a specific job performance evaluation snapshot by its unique
 * identifier.
 *
 * This function fetches immutable historical evaluation data combining employee
 * self-evaluations and manager evaluations for a given evaluation cycle. Only
 * non-deleted records (soft delete checking) are fetched.
 *
 * @param props - Object containing authenticated manager and snapshot ID
 * @param props.manager - Authenticated manager payload
 * @param props.id - UUID of the evaluation snapshot to retrieve
 * @returns The detailed evaluation snapshot including all scores and comments
 * @throws {Error} If the snapshot is not found
 */
export async function getjobPerformanceEvalManagerEvaluationSnapshotsId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalEvaluationSnapshot> {
  const { manager, id } = props;

  const record =
    await MyGlobal.prisma.job_performance_eval_evaluation_snapshots.findUniqueOrThrow(
      {
        where: { id, deleted_at: null },
      },
    );

  return {
    id: record.id,
    evaluation_cycle_id: record.evaluation_cycle_id,
    employee_id: record.employee_id,
    performance_score: record.performance_score,
    knowledge_score: record.knowledge_score,
    problem_solving_score: record.problem_solving_score,
    innovation_score: record.innovation_score,
    manager_performance_score: record.manager_performance_score ?? null,
    manager_knowledge_score: record.manager_knowledge_score ?? null,
    manager_problem_solving_score: record.manager_problem_solving_score ?? null,
    manager_innovation_score: record.manager_innovation_score ?? null,
    employee_comment: record.employee_comment ?? null,
    manager_comment: record.manager_comment ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}

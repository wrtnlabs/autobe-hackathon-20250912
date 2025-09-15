import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEvaluationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEvaluationSnapshot";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Retrieve a specific job performance evaluation snapshot by ID
 *
 * This operation fetches an evaluation snapshot from the
 * job_performance_eval_evaluation_snapshots table by its unique identifier. It
 * validates that the authenticated employee requesting the data owns the
 * evaluation snapshot. It returns detailed evaluation scores and comments,
 * including self-assessments and manager evaluations. Soft deleted records are
 * excluded.
 *
 * @param props - Object containing the authenticated employee and snapshot ID
 * @param props.employee - Authenticated employee payload
 * @param props.id - UUID of the evaluation snapshot to retrieve
 * @returns The detailed evaluation snapshot matching the ID
 * @throws {Error} If the snapshot is not found or the employee is unauthorized
 */
export async function getjobPerformanceEvalEmployeeEvaluationSnapshotsId(props: {
  employee: EmployeePayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalEvaluationSnapshot> {
  const { employee, id } = props;

  const snapshot =
    await MyGlobal.prisma.job_performance_eval_evaluation_snapshots.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  if (snapshot.deleted_at !== null) {
    throw new Error("Evaluation snapshot not found");
  }

  if (snapshot.employee_id !== employee.id) {
    throw new Error("Unauthorized: Employee does not own this snapshot");
  }

  return {
    id: snapshot.id,
    evaluation_cycle_id: snapshot.evaluation_cycle_id,
    employee_id: snapshot.employee_id,
    performance_score: snapshot.performance_score,
    knowledge_score: snapshot.knowledge_score,
    problem_solving_score: snapshot.problem_solving_score,
    innovation_score: snapshot.innovation_score,
    manager_performance_score: snapshot.manager_performance_score,
    manager_knowledge_score: snapshot.manager_knowledge_score,
    manager_problem_solving_score: snapshot.manager_problem_solving_score,
    manager_innovation_score: snapshot.manager_innovation_score,
    employee_comment: snapshot.employee_comment,
    manager_comment: snapshot.manager_comment,
    created_at: toISOStringSafe(snapshot.created_at),
    updated_at: toISOStringSafe(snapshot.updated_at),
    deleted_at: snapshot.deleted_at
      ? toISOStringSafe(snapshot.deleted_at)
      : null,
  };
}

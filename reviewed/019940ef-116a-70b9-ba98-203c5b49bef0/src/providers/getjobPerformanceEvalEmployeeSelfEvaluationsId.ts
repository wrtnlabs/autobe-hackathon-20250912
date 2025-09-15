import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Retrieve a specific employee self-evaluation by ID
 *
 * This API endpoint fetches complete details of a single employee
 * self-evaluation identified by its unique ID.
 *
 * Only the employee who owns the self-evaluation can access it.
 *
 * @param props - Object containing the authenticated employee and the
 *   self-evaluation ID
 * @param props.employee - Authenticated employee payload
 * @param props.id - UUID of the self-evaluation to retrieve
 * @returns The detailed self-evaluation entity
 * @throws {Error} If the self-evaluation does not exist or is not owned by the
 *   employee
 */
export async function getjobPerformanceEvalEmployeeSelfEvaluationsId(props: {
  employee: EmployeePayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalSelfEvaluation> {
  const record =
    await MyGlobal.prisma.job_performance_eval_self_evaluations.findUniqueOrThrow(
      {
        where: { id: props.id },
      },
    );

  if (record.employee_id !== props.employee.id) {
    throw new Error(
      "Unauthorized access: You can only access your own self-evaluation.",
    );
  }

  return {
    id: record.id,
    employee_id: record.employee_id,
    evaluation_cycle_id: record.evaluation_cycle_id,
    evaluation_date: toISOStringSafe(record.evaluation_date),
    work_performance_score: record.work_performance_score,
    knowledge_skill_score: record.knowledge_skill_score,
    problem_solving_collab_score: record.problem_solving_collab_score,
    innovation_score: record.innovation_score,
    overall_comment: record.overall_comment,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}

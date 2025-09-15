import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalSelfEvaluation } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalSelfEvaluation";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Creates a new self-evaluation record for an authenticated employee.
 *
 * This operation allows an employee to submit performance evaluation scores and
 * a mandatory comment tied to a specific evaluation cycle. It automatically
 * manages timestamps and assigns a unique UUID.
 *
 * @param props - Object containing the authenticated employee and
 *   self-evaluation input data.
 * @param props.employee - The authenticated employee performing the evaluation.
 * @param props.body - The self-evaluation data including scores and overall
 *   comment.
 * @returns The newly created self-evaluation record including timestamps and
 *   UUID.
 * @throws Throws if database operation fails or validation errors occur
 *   upstream.
 */
export async function postjobPerformanceEvalEmployeeSelfEvaluations(props: {
  employee: EmployeePayload;
  body: IJobPerformanceEvalSelfEvaluation.ICreate;
}): Promise<IJobPerformanceEvalSelfEvaluation> {
  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.job_performance_eval_self_evaluations.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        employee_id: props.employee.id,
        evaluation_cycle_id: props.body.evaluation_cycle_id,
        evaluation_date: props.body.evaluation_date,
        work_performance_score: props.body.work_performance_score,
        knowledge_skill_score: props.body.knowledge_skill_score,
        problem_solving_collab_score: props.body.problem_solving_collab_score,
        innovation_score: props.body.innovation_score,
        overall_comment: props.body.overall_comment,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id as string & tags.Format<"uuid">,
    employee_id: created.employee_id as string & tags.Format<"uuid">,
    evaluation_cycle_id: created.evaluation_cycle_id as string &
      tags.Format<"uuid">,
    evaluation_date: toISOStringSafe(created.evaluation_date),
    work_performance_score: created.work_performance_score,
    knowledge_skill_score: created.knowledge_skill_score,
    problem_solving_collab_score: created.problem_solving_collab_score,
    innovation_score: created.innovation_score,
    overall_comment: created.overall_comment,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}

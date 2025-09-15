import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Create a new employee comment.
 *
 * This operation creates a new employee comment record linked to a specific
 * employee and evaluation cycle with the mandatory comment text. Only employees
 * with valid authentication can perform this action.
 *
 * @param props - Object containing the authenticated employee payload and the
 *   comment creation data.
 * @param props.employee - The authenticated employee performing the creation.
 * @param props.body - The request body containing employee_id,
 *   evaluation_cycle_id, and comment.
 * @returns The newly created employee comment including its generated ID and
 *   timestamps.
 * @throws {Error} Throws if creation fails due to database errors or constraint
 *   violations.
 */
export async function postjobPerformanceEvalEmployeeEmployeeComments(props: {
  employee: EmployeePayload;
  body: IJobPerformanceEvalEmployeeComments.ICreate;
}): Promise<IJobPerformanceEvalEmployeeComments> {
  const { employee, body } = props;

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.job_performance_eval_employee_comments.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        employee_id: body.employee_id,
        evaluation_cycle_id: body.evaluation_cycle_id,
        comment: body.comment,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    employee_id: created.employee_id,
    evaluation_cycle_id: created.evaluation_cycle_id,
    comment: created.comment,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}

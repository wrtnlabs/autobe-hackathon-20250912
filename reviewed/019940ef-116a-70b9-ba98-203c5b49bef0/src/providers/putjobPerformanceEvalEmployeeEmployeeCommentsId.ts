import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEmployeeComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployeeComments";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Update an existing employee comment by its unique UUID.
 *
 * This function updates only the comment content of the specified employee
 * comment record. It ensures that the authenticated employee is the owner of
 * the comment before allowing the update. The timestamps are managed with
 * toISOStringSafe to maintain consistent ISO 8601 date-time formatting.
 *
 * @param props - Object containing employee, id, and body of the update.
 * @param props.employee - The authenticated employee payload performing the
 *   update.
 * @param props.id - UUID of the employee comment to update.
 * @param props.body - Object containing the updated comment content.
 * @returns The updated employee comment record with proper date string
 *   formatting.
 * @throws {Error} When the employee comment does not exist.
 * @throws {Error} When the authenticated employee is not the owner of the
 *   comment.
 */
export async function putjobPerformanceEvalEmployeeEmployeeCommentsId(props: {
  employee: EmployeePayload;
  id: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalEmployeeComments.IUpdate;
}): Promise<IJobPerformanceEvalEmployeeComments> {
  const { employee, id, body } = props;

  // Find the existing employee comment
  const existing =
    await MyGlobal.prisma.job_performance_eval_employee_comments.findUnique({
      where: { id },
    });

  if (!existing) {
    throw new Error("Employee comment not found.");
  }

  // Authorization check: employee must own the comment
  if (existing.employee_id !== employee.id) {
    throw new Error("Unauthorized: You can only update your own comments.");
  }

  // Update only comment and updated_at
  const updated =
    await MyGlobal.prisma.job_performance_eval_employee_comments.update({
      where: { id },
      data: {
        comment: body.comment ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return updated record with proper ISO date strings
  return {
    id: updated.id,
    employee_id: updated.employee_id,
    evaluation_cycle_id: updated.evaluation_cycle_id,
    comment: updated.comment,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}

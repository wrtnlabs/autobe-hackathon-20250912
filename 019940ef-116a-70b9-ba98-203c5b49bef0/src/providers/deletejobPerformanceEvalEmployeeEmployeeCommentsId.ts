import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Delete an employee comment by ID.
 *
 * This operation permanently removes the employee comment record from the
 * database, identified by the UUID path parameter. Only employees can perform
 * this operation and only on their own comments.
 *
 * @param props - Object containing the authenticated employee and comment ID
 * @param props.employee - The authenticated employee performing the deletion
 * @param props.id - The UUID of the comment to delete
 * @throws {Error} Throws if the comment does not exist
 * @throws {Error} Throws if the authenticated employee does not own the comment
 */
export async function deletejobPerformanceEvalEmployeeEmployeeCommentsId(props: {
  employee: EmployeePayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { employee, id } = props;

  const comment =
    await MyGlobal.prisma.job_performance_eval_employee_comments.findUnique({
      where: { id },
    });
  if (!comment) throw new Error("Comment not found");

  if (comment.employee_id !== employee.id) {
    throw new Error("Unauthorized: You can only delete your own comments");
  }

  await MyGlobal.prisma.job_performance_eval_employee_comments.delete({
    where: { id },
  });
}

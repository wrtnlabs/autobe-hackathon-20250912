import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Soft delete a self-evaluation record by ID.
 *
 * This function performs a soft delete on a job performance evaluation
 * self-evaluation record specified by the unique UUID identifier. It sets the
 * `deleted_at` timestamp to the current time, preserving audit trails and
 * compliance requirements.
 *
 * Authorization is enforced to ensure only the employee owning the record can
 * perform this action.
 *
 * @param props - Object containing required parameters
 * @param props.employee - The authenticated employee performing the deletion
 * @param props.id - The UUID of the self-evaluation record to soft delete
 * @throws {Error} When the record is not found or already deleted
 * @throws {Error} When the employee is not authorized to delete this record
 */
export async function deletejobPerformanceEvalEmployeeSelfEvaluationsId(props: {
  employee: EmployeePayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { employee, id } = props;

  const record =
    await MyGlobal.prisma.job_performance_eval_self_evaluations.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

  if (record === null) {
    throw new Error("Self-evaluation record not found or already deleted");
  }

  if (record.employee_id !== employee.id) {
    throw new Error(
      "Unauthorized: You can only delete your own self-evaluation",
    );
  }

  const deletedAt = toISOStringSafe(new Date());

  await MyGlobal.prisma.job_performance_eval_self_evaluations.update({
    where: { id },
    data: { deleted_at: deletedAt },
  });
}

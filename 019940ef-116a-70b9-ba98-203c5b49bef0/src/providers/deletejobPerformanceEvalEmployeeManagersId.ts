import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Soft delete a manager by ID.
 *
 * This operation marks a manager record as deleted by setting the deleted_at
 * timestamp in the job performance evaluation system. Only authenticated
 * employees may perform this operation.
 *
 * @param props - Object containing the employee payload and manager ID.
 * @param props.employee - Authenticated employee performing the deletion.
 * @param props.id - The unique UUID of the manager to be soft deleted.
 * @throws {Error} When the manager with the given ID does not exist or is
 *   already deleted.
 */
export async function deletejobPerformanceEvalEmployeeManagersId(props: {
  employee: EmployeePayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { employee, id } = props;

  const manager = await MyGlobal.prisma.job_performance_eval_managers.findFirst(
    {
      where: {
        id,
        deleted_at: null,
      },
    },
  );

  if (!manager) {
    throw new Error("Manager not found or already deleted.");
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.job_performance_eval_managers.update({
    where: { id },
    data: {
      deleted_at: now,
    },
  });
}

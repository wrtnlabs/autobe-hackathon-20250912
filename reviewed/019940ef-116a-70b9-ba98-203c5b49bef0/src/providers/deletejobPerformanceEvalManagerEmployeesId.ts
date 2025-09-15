import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Erase an employee record by ID.
 *
 * This operation deletes a specific employee record permanently from the
 * job_performance_eval_employees table. It is restricted to authorized managers
 * and does not support recovery (hard delete).
 *
 * @param props - Request properties
 * @param props.manager - The authenticated manager performing the deletion
 * @param props.id - Unique identifier of the employee to delete
 * @throws {Error} When the employee with the specified ID does not exist
 */
export async function deletejobPerformanceEvalManagerEmployeesId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { manager, id } = props;

  // Verify employee existence before deletion
  const employee =
    await MyGlobal.prisma.job_performance_eval_employees.findUnique({
      where: { id },
    });
  if (!employee) {
    throw new Error("Employee not found");
  }

  // Hard delete the employee record
  await MyGlobal.prisma.job_performance_eval_employees.delete({
    where: { id },
  });
}

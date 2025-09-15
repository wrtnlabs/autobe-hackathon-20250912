import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Update existing employee information by ID.
 *
 * Allows a manager to update fields such as email, password hash, name, and
 * soft delete timestamp. Updates the updated_at timestamp automatically.
 *
 * @param props - Object containing manager authentication, employee ID, and
 *   update data
 * @param props.manager - Authenticated manager performing the update
 * @param props.id - The UUID of the employee to update
 * @param props.body - The update data for the employee
 * @returns The updated employee record with standardized timestamps
 * @throws {Error} If no employee with the specified ID exists
 */
export async function putjobPerformanceEvalManagerEmployeesId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalEmployee.IUpdate;
}): Promise<IJobPerformanceEvalEmployee> {
  const { manager, id, body } = props;

  const updated = await MyGlobal.prisma.job_performance_eval_employees.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      name: body.name ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Update existing employee information by ID.
 *
 * This function updates email, password_hash, and name fields of an employee
 * identified by the given UUID. It also manages soft deletion timestamps and
 * updates the 'updated_at' timestamp to the current time.
 *
 * Authorization: Only the authenticated employee can perform this update on
 * their own record.
 *
 * @param props - Object containing employee authorization payload, target
 *   employee ID, and update body.
 * @param props.employee - Authenticated employee payload.
 * @param props.id - Unique UUID of the employee to update.
 * @param props.body - Partial update data for employee attributes.
 * @returns The updated employee data conforming to IJobPerformanceEvalEmployee.
 * @throws {Error} If an employee tries to update another employee's data
 *   (unauthorized).
 * @throws {Error} If the target employee record is not found or already soft
 *   deleted.
 */
export async function putjobPerformanceEvalEmployeeEmployeesId(props: {
  employee: EmployeePayload;
  id: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalEmployee.IUpdate;
}): Promise<IJobPerformanceEvalEmployee> {
  if (props.employee.id !== props.id) {
    throw new Error("Unauthorized: cannot update another employee's data");
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.job_performance_eval_employees.update({
    where: {
      id: props.id,
      deleted_at: null,
    },
    data: {
      email: props.body.email ?? undefined,
      password_hash: props.body.password_hash ?? undefined,
      name: props.body.name ?? undefined,
      deleted_at:
        props.body.deleted_at === undefined ? undefined : props.body.deleted_at,
      updated_at: now,
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

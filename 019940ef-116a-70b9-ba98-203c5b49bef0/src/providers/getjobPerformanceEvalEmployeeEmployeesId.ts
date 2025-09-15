import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Retrieve detailed information of a specific employee by their unique
 * identifier.
 *
 * This GET API endpoint fetches employee personal and authentication details,
 * including email, name, and timestamps. Access is restricted to authenticated
 * employees or managers. Soft-deleted employees are excluded from results.
 *
 * @param props - Object containing the authenticated employee and the target
 *   employee ID.
 * @param props.employee - The authenticated employee making the request.
 * @param props.id - Unique UUID of the employee to retrieve information for.
 * @returns The detailed employee information conforming to
 *   IJobPerformanceEvalEmployee.
 * @throws {Error} Throws if no employee with the specified ID exists (including
 *   if soft-deleted).
 */
export async function getjobPerformanceEvalEmployeeEmployeesId(props: {
  employee: EmployeePayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalEmployee> {
  const { id } = props;

  const employeeRecord =
    await MyGlobal.prisma.job_performance_eval_employees.findFirstOrThrow({
      where: { id, deleted_at: null },
    });

  return {
    id: employeeRecord.id,
    email: employeeRecord.email,
    password_hash: employeeRecord.password_hash,
    name: employeeRecord.name,
    created_at: toISOStringSafe(employeeRecord.created_at),
    updated_at: toISOStringSafe(employeeRecord.updated_at),
    deleted_at: employeeRecord.deleted_at
      ? toISOStringSafe(employeeRecord.deleted_at)
      : undefined,
  };
}

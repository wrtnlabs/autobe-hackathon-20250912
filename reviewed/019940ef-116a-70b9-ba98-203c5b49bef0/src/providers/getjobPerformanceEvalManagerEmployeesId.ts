import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalEmployee";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Retrieve detailed information of a specific employee by ID.
 *
 * This GET API endpoint allows authorized managers to fetch detailed
 * information about a single employee identified by their unique UUID. It
 * ensures that the latest employee data, including email, name, password hash,
 * creation and update timestamps, and soft deletion status, are retrieved
 * accurately.
 *
 * @param props - Object containing the manager's authorization payload and the
 *   employee's UUID.
 * @param props.manager - Authenticated manager requesting the data.
 * @param props.id - UUID of the target employee.
 * @returns An object conforming to IJobPerformanceEvalEmployee containing
 *   employee details.
 * @throws {Error} Throws if the employee with the specified ID does not exist.
 */
export async function getjobPerformanceEvalManagerEmployeesId(props: {
  manager: ManagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalEmployee> {
  const { manager, id } = props;

  const employee =
    await MyGlobal.prisma.job_performance_eval_employees.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: employee.id,
    email: employee.email,
    password_hash: employee.password_hash,
    name: employee.name,
    created_at: toISOStringSafe(employee.created_at),
    updated_at: toISOStringSafe(employee.updated_at),
    deleted_at: employee.deleted_at
      ? toISOStringSafe(employee.deleted_at)
      : null,
  };
}

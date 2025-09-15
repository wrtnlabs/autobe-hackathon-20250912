import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Retrieve detailed information for a manager by their unique identifier.
 *
 * This operation fetches a manager's ID, email, name, and record timestamps,
 * excluding the password hash to maintain security.
 *
 * Authorization: Requires an authenticated employee user.
 *
 * @param props - Object containing the authenticated employee and the manager
 *   ID
 * @param props.employee - The authenticated employee requesting the manager
 *   data
 * @param props.id - UUID of the manager to retrieve
 * @returns The detailed manager record with safe fields
 * @throws {Error} If the manager with the given ID does not exist
 */
export async function getjobPerformanceEvalEmployeeManagersId(props: {
  employee: EmployeePayload;
  id: string & tags.Format<"uuid">;
}): Promise<IJobPerformanceEvalManager> {
  const { employee, id } = props;

  const manager =
    await MyGlobal.prisma.job_performance_eval_managers.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  return {
    id: manager.id,
    email: manager.email,
    name: manager.name,
    created_at: toISOStringSafe(manager.created_at),
    updated_at: toISOStringSafe(manager.updated_at),
    deleted_at: manager.deleted_at
      ? toISOStringSafe(manager.deleted_at)
      : undefined,
  };
}

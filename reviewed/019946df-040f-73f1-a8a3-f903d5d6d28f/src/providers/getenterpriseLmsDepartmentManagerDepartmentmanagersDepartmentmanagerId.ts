import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Retrieve detailed information about a specific Department Manager identified
 * by departmentmanagerId. This operation securely fetches the Department
 * Manager record scoped within the tenant organization. Returns all user
 * properties including email, names, status, timestamps, and soft deletion
 * status.
 *
 * Authorization requires the user to have the 'departmentManager' role.
 *
 * @param props - Object containing the authenticated departmentManager and the
 *   departmentmanagerId parameter.
 * @param props.departmentManager - Authenticated Department Manager payload.
 * @param props.departmentmanagerId - Unique identifier for the Department
 *   Manager.
 * @returns Detailed information of the requested Department Manager.
 * @throws {Error} When the Department Manager with the specified ID does not
 *   exist.
 */
export async function getenterpriseLmsDepartmentManagerDepartmentmanagersDepartmentmanagerId(props: {
  departmentManager: DepartmentmanagerPayload;
  departmentmanagerId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsDepartmentManager> {
  const { departmentManager, departmentmanagerId } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_departmentmanager.findUnique({
      where: {
        id: departmentmanagerId,
      },
    });

  if (record === null) {
    throw new Error(
      `Department Manager with ID ${departmentmanagerId} not found`,
    );
  }

  return {
    id: record.id,
    tenant_id: record.tenant_id,
    email: record.email,
    password_hash: record.password_hash,
    first_name: record.first_name,
    last_name: record.last_name,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}

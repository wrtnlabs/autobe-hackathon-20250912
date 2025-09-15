import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Update details of a Department Manager identified by departmentmanagerId.
 *
 * This operation updates one or more fields of the Department Manager, ensuring
 * that only the authenticated Department Manager can perform the update to
 * maintain tenant data isolation.
 *
 * @param props - Object containing the authenticated Department Manager, the
 *   target departmentmanagerId, and the update payload body.
 * @param props.departmentManager - Authenticated Department Manager payload.
 * @param props.departmentmanagerId - UUID of the Department Manager to update.
 * @param props.body - Partial update data for the Department Manager.
 * @returns The updated Department Manager object reflecting the applied
 *   changes.
 * @throws {Error} If the Department Manager to update is not found or the
 *   authenticated user is unauthorized to perform the update.
 */
export async function putenterpriseLmsDepartmentManagerDepartmentmanagersDepartmentmanagerId(props: {
  departmentManager: DepartmentmanagerPayload;
  departmentmanagerId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsDepartmentManager.IUpdate;
}): Promise<IEnterpriseLmsDepartmentManager> {
  const { departmentManager, departmentmanagerId, body } = props;

  // Fetch the existing Department Manager record by ID
  const existing =
    await MyGlobal.prisma.enterprise_lms_departmentmanager.findUniqueOrThrow({
      where: { id: departmentmanagerId },
    });

  // Verify the authenticated user owns the record (authorization)
  if (existing.id !== departmentManager.id) {
    throw new Error(
      "Unauthorized: cannot update other Department Manager records",
    );
  }

  // Prepare update data, including nullable deleted_at handling
  const updateData: IEnterpriseLmsDepartmentManager.IUpdate = {
    email: body.email ?? undefined,
    password_hash: body.password_hash ?? undefined,
    first_name: body.first_name ?? undefined,
    last_name: body.last_name ?? undefined,
    status: body.status ?? undefined,
    deleted_at:
      body.deleted_at === null ? null : (body.deleted_at ?? undefined),
  };

  // Update the record, skipping unchanged fields
  const updated = await MyGlobal.prisma.enterprise_lms_departmentmanager.update(
    {
      where: { id: departmentmanagerId },
      data: updateData,
    },
  );

  // Return updated record with date fields converted to strings
  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    email: updated.email,
    password_hash: updated.password_hash,
    first_name: updated.first_name,
    last_name: updated.last_name,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

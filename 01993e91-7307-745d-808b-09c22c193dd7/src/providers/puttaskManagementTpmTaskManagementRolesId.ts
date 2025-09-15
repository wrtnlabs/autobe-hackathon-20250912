import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskManagementRoles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskManagementRoles";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Updates an existing TaskManagementRole identified by UUID.
 *
 * Only authorized TPM users can perform this operation. Validates uniqueness of
 * the 'code' field to avoid duplicates.
 *
 * @param props - The properties containing tpm payload, role id and update body
 * @param props.tpm - Authenticated TPM user performing the update
 * @param props.id - UUID of the TaskManagementRole to update
 * @param props.body - The update data (code, name, optional description)
 * @returns Updated TaskManagementRole with all fields populated
 * @throws {Error} When task management role not found
 * @throws {Error} When code uniqueness constraint is violated
 */
export async function puttaskManagementTpmTaskManagementRolesId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementTaskManagementRoles.IUpdate;
}): Promise<ITaskManagementTaskManagementRoles> {
  const { tpm, id, body } = props;

  // Fetch existing role
  const existing = await MyGlobal.prisma.task_management_roles.findUnique({
    where: { id },
  });
  if (!existing) throw new Error("TaskManagementRole not found");

  // Check for code uniqueness if code is provided and different
  if (body.code !== undefined && body.code !== null) {
    const duplicate = await MyGlobal.prisma.task_management_roles.findFirst({
      where: { code: body.code, id: { not: id } },
    });
    if (duplicate) throw new Error("TaskManagementRole code must be unique");
  }

  // Prepare update data for Prisma
  const updateData: ITaskManagementTaskManagementRoles.IUpdate = {
    code: body.code === null ? undefined : body.code,
    name: body.name === null ? undefined : body.name,
    description: body.description ?? undefined,
  };

  // Perform update
  const updated = await MyGlobal.prisma.task_management_roles.update({
    where: { id },
    data: {
      code: updateData.code,
      name: updateData.name,
      description: updateData.description,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return updated record with date fields converted
  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}

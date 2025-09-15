import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Delete a taskManagementRole by ID
 *
 * Deletes a specific taskManagementRole by its unique identifier.
 *
 * This operation permanently removes the role from the underlying
 * task_management_roles table.
 *
 * Only authorized TPM users may perform this operation to ensure security and
 * integrity of role management.
 *
 * @param props - Object containing TPM authentication payload and the role ID
 *   to delete
 * @param props.tpm - Authenticated TPM user payload
 * @param props.id - Unique UUID identifier of the taskManagementRole to delete
 * @returns Promise<void> indicating successful deletion
 * @throws {Error} When the role with specified ID does not exist
 */
export async function deletetaskManagementTpmTaskManagementRolesId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { tpm, id } = props;

  // Confirm the role exists or throw error
  await MyGlobal.prisma.task_management_roles.findUniqueOrThrow({
    where: { id },
  });

  // Perform hard delete
  await MyGlobal.prisma.task_management_roles.delete({
    where: { id },
  });
}

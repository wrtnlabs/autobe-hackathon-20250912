import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Delete a taskManagementRole by its unique ID.
 *
 * This operation permanently removes the taskManagementRole record from the
 * database. Only authorized PM users can perform this operation.
 *
 * @param props - Properties including the authenticated PM user and the role ID
 * @param props.pm - The authenticated PM user performing the operation
 * @param props.id - The UUID of the taskManagementRole to delete
 * @returns Promise that resolves when deletion is complete
 * @throws {Error} Throws if the role is not found
 */
export async function deletetaskManagementPmTaskManagementRolesId(props: {
  pm: PmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { pm, id } = props;

  // Verify the existence of the taskManagementRole
  await MyGlobal.prisma.task_management_roles.findUniqueOrThrow({
    where: { id },
  });

  // Delete the taskManagementRole
  await MyGlobal.prisma.task_management_roles.delete({
    where: { id },
  });
}

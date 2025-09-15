import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Deletes a specific taskManagementRole by its unique identifier.
 *
 * This operation permanently removes the role from the underlying
 * task_management_roles table.
 *
 * Only authorized PMO users may perform this operation.
 *
 * @param props - Object containing authorization payload and role ID
 * @param props.pmo - The authenticated PMO user performing the deletion
 * @param props.id - The UUID of the taskManagementRole to delete
 * @throws {Error} When the specified role does not exist
 */
export async function deletetaskManagementPmoTaskManagementRolesId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.task_management_roles.findUniqueOrThrow({
    where: { id: props.id },
  });

  await MyGlobal.prisma.task_management_roles.delete({
    where: { id: props.id },
  });
}

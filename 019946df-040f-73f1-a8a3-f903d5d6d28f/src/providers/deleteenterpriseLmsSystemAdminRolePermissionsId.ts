import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete a role permission by its unique ID.
 *
 * This operation permanently removes the record from the database. Only
 * systemAdmin role users are authorized to execute this operation.
 *
 * @param props - Object containing the systemAdmin payload and the role
 *   permission ID to delete.
 * @param props.systemAdmin - The authenticated systemAdmin executing the
 *   deletion.
 * @param props.id - The UUID of the role permission to be deleted.
 * @throws {Error} Throws an error if the role permission does not exist.
 */
export async function deleteenterpriseLmsSystemAdminRolePermissionsId(props: {
  systemAdmin: SystemadminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { id } = props;

  await MyGlobal.prisma.enterprise_lms_role_permissions.findUniqueOrThrow({
    where: { id },
  });

  await MyGlobal.prisma.enterprise_lms_role_permissions.delete({
    where: { id },
  });
}

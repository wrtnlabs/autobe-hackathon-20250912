import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Permanently deletes a system administrator user account identified by the
 * given UUID.
 *
 * This operation removes the user record entirely from the database and cannot
 * be undone through the API. Access is restricted to authenticated users with
 * the 'systemAdmin' role.
 *
 * @param props - Object containing the authenticated systemAdmin and the UUID
 *   of the user to delete
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the deletion
 * @param props.id - The UUID of the system administrator user to delete
 * @throws {Error} Throws when the specified ID does not exist or deletion fails
 */
export async function deletenotificationWorkflowSystemAdminSystemAdminsId(props: {
  systemAdmin: SystemAdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, id } = props;

  await MyGlobal.prisma.notification_workflow_systemadmins.delete({
    where: { id },
  });
}

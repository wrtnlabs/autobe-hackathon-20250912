import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a specific admin notification in
 * oauth_server_admin_notifications.
 *
 * This operation sets the deleted_at timestamp of the target notification,
 * marking it as deleted without physically removing the record.
 *
 * Only authenticated admin users can perform this operation.
 *
 * @param props - Object containing the admin payload and notification ID
 * @param props.admin - Authenticated admin performing the deletion
 * @param props.id - UUID of the notification to be soft deleted
 * @returns Void
 * @throws {Error} Throws an error if the notification does not exist
 */
export async function deleteoauthServerAdminOauthServerAdminNotificationsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Verify the notification exists or throw error
  await MyGlobal.prisma.oauth_server_admin_notifications.findUniqueOrThrow({
    where: { id },
  });

  // Prepare current timestamp for soft delete
  const deletedAt = toISOStringSafe(new Date());

  // Perform soft delete by setting deleted_at
  await MyGlobal.prisma.oauth_server_admin_notifications.update({
    where: { id },
    data: { deleted_at: deletedAt },
  });
}

import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete a notification by ID
 *
 * This API operation permanently deletes a notification record from the
 * event_registration_notifications table, effectively removing the notification
 * for the associated user or system logs. It requires the notification ID as a
 * path parameter. This operation performs a hard delete and should be
 * restricted to authorized users managing their notifications or admins
 * performing cleanup. No response body is returned.
 *
 * Authorization ensures only the notification owner or administrators can
 * perform this hard delete operation.
 *
 * @param props - Object containing the authenticated admin and the notification
 *   ID to delete
 * @param props.admin - The authenticated admin performing the operation
 * @param props.notificationId - The unique identifier of the notification to be
 *   deleted
 * @returns Void
 * @throws {Error} If the notification does not exist
 * @throws {Error} If the admin is not authorized to delete the notification
 */
export async function deleteeventRegistrationAdminNotificationsNotificationId(props: {
  admin: AdminPayload;
  notificationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, notificationId } = props;

  await MyGlobal.prisma.event_registration_notifications.delete({
    where: { id: notificationId },
  });
}

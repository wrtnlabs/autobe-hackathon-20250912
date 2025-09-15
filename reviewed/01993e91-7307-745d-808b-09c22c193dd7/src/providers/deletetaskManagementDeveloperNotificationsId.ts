import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Delete a notification by ID from task_management_notifications
 *
 * This operation permanently deletes a notification record identified by its
 * UUID. Authorization is enforced by verifying ownership matching the developer
 * invoking this.
 *
 * @param props - Object containing developer payload and notification UUID
 * @param props.developer - Authenticated developer performing the deletion
 * @param props.id - UUID of the notification to delete
 * @throws {Error} When the notification with the given ID does not exist
 * @throws {Error} When the developer is not authorized to delete the
 *   notification
 */
export async function deletetaskManagementDeveloperNotificationsId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { developer, id } = props;
  const notification =
    await MyGlobal.prisma.task_management_notifications.findUnique({
      where: { id },
    });
  if (!notification) throw new Error("Notification not found");
  if (notification.user_id !== developer.id)
    throw new Error("Unauthorized to delete this notification");
  await MyGlobal.prisma.task_management_notifications.delete({
    where: { id },
  });
}

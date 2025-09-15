import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Retrieve detailed information for a specific notification by ID for PMO.
 *
 * This function fetches a notification by its UUID and ensures that the
 * requesting PMO user is authorized to view it by checking against the
 * notification's user_id.
 *
 * @param props - Object containing the PMO user's payload and notification ID.
 * @param props.pmo - The authenticated PMO user payload.
 * @param props.id - UUID of the notification to retrieve.
 * @returns The detailed notification information conforming to
 *   ITaskManagementNotification.
 * @throws {Error} When access is forbidden due to user mismatch.
 * @throws {Error} When the notification with the specified ID does not exist.
 */
export async function gettaskManagementPmoNotificationsId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementNotification> {
  const notification =
    await MyGlobal.prisma.task_management_notifications.findUniqueOrThrow({
      where: { id: props.id },
    });

  if (notification.user_id !== props.pmo.id) {
    throw new Error("Forbidden: Access to this notification is denied.");
  }

  return {
    id: notification.id,
    user_id: notification.user_id,
    task_id: notification.task_id ?? null,
    notification_type: notification.notification_type,
    is_read: notification.is_read,
    read_at: notification.read_at
      ? toISOStringSafe(notification.read_at)
      : null,
    created_at: toISOStringSafe(notification.created_at),
    updated_at: toISOStringSafe(notification.updated_at),
    deleted_at: notification.deleted_at
      ? toISOStringSafe(notification.deleted_at)
      : null,
  };
}

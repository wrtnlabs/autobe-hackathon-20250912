import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieve detailed information for a specific notification by ID
 *
 * This function fetches a single notification for the authenticated developer
 * user, verifying ownership and active (non-deleted) status. It returns the
 * full notification details including read status, type, and timestamps.
 *
 * @param props - Object containing the developer payload and notification ID
 * @param props.developer - The authenticated developer making the request
 * @param props.id - The UUID of the notification to retrieve
 * @returns The detailed notification information matching
 *   ITaskManagementNotification
 * @throws {Error} If the notification does not exist or does not belong to the
 *   developer
 */
export async function gettaskManagementDeveloperNotificationsId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementNotification> {
  const { developer, id } = props;

  const notification =
    await MyGlobal.prisma.task_management_notifications.findFirstOrThrow({
      where: {
        id,
        user_id: developer.id,
        deleted_at: null,
      },
    });

  return {
    id: notification.id,
    user_id: notification.user_id,
    task_id: notification.task_id ?? undefined,
    notification_type: notification.notification_type,
    is_read: notification.is_read,
    read_at: notification.read_at ?? undefined,
    created_at: toISOStringSafe(notification.created_at),
    updated_at: toISOStringSafe(notification.updated_at),
    deleted_at: notification.deleted_at ?? undefined,
  };
}

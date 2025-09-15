import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Retrieve detailed information for a specific notification by ID.
 *
 * This function fetches a notification record from the database ensuring the
 * authenticated designer owns the notification and it is not soft deleted. It
 * returns all notification details including read status and timestamps.
 *
 * @param props - Object containing the authenticated designer and notification
 *   ID
 * @param props.designer - Authenticated designer making the request
 * @param props.id - UUID of the notification to retrieve
 * @returns Detailed notification information matching
 *   ITaskManagementNotification
 * @throws {Error} Throws if notification not found or access is unauthorized
 */
export async function gettaskManagementDesignerNotificationsId(props: {
  designer: DesignerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementNotification> {
  const { designer, id } = props;

  const notification =
    await MyGlobal.prisma.task_management_notifications.findFirstOrThrow({
      where: {
        id,
        user_id: designer.id,
        deleted_at: null,
      },
    });

  return {
    id: notification.id,
    user_id: notification.user_id,
    task_id: notification.task_id ?? null,
    notification_type: notification.notification_type,
    is_read: notification.is_read,
    read_at: notification.read_at ?? null,
    created_at: toISOStringSafe(notification.created_at),
    updated_at: toISOStringSafe(notification.updated_at),
    deleted_at: notification.deleted_at ?? null,
  };
}

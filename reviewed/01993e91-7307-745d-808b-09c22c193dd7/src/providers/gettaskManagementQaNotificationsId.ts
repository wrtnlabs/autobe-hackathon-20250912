import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Retrieve detailed notification information by notification ID.
 *
 * This operation fetches a single notification record belonging to the
 * authenticated QA user. The notification includes read status, type, related
 * task ID, and all audit timestamps.
 *
 * Authorization: Only the QA user owning the notification can access it.
 *
 * @param props - An object containing the QA payload and notification ID.
 * @param props.qa - Authenticated QA user payload containing user ID.
 * @param props.id - UUID of the notification to retrieve.
 * @returns Detailed notification information conforming to
 *   ITaskManagementNotification.
 * @throws {Error} Throws if the notification does not exist or does not belong
 *   to the user.
 */
export async function gettaskManagementQaNotificationsId(props: {
  qa: QaPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementNotification> {
  const { qa, id } = props;

  const notification =
    await MyGlobal.prisma.task_management_notifications.findFirstOrThrow({
      where: {
        id,
        user_id: qa.id,
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

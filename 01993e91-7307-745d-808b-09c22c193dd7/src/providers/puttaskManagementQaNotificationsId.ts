import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Update notification properties such as read status
 *
 * This endpoint updates an existing notification record identified by the given
 * notification ID, allowing modifications of the is_read flag and the read_at
 * timestamp. It enforces that the notification belongs to the QA user provided
 * in the authentication payload and is not soft deleted.
 *
 * @param props - Object containing the QA user payload, notification ID, and
 *   update data
 * @param props.qa - The authenticated QA user performing the update
 * @param props.id - Unique identifier (UUID) of the notification to be updated
 * @param props.body - Object containing the notification update fields
 *   (is_read, read_at)
 * @returns The updated notification record with all current fields
 * @throws {Error} If the notification does not exist or the QA user is
 *   unauthorized
 */
export async function puttaskManagementQaNotificationsId(props: {
  qa: QaPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementNotification.IUpdate;
}): Promise<ITaskManagementNotification> {
  const { qa, id, body } = props;

  // Ensure the notification exists and belongs to the QA user
  const notification =
    await MyGlobal.prisma.task_management_notifications.findFirst({
      where: {
        id: id,
        user_id: qa.id,
        deleted_at: null,
      },
    });

  if (!notification) throw new Error("Notification not found or unauthorized");

  // Perform the update with provided fields
  const updated = await MyGlobal.prisma.task_management_notifications.update({
    where: { id },
    data: {
      is_read: body.is_read ?? undefined,
      read_at: body.read_at ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated notification with proper Date conversions
  return {
    id: updated.id,
    user_id: updated.user_id,
    task_id: updated.task_id ?? null,
    notification_type: updated.notification_type,
    is_read: updated.is_read,
    read_at: updated.read_at ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ?? null,
  };
}

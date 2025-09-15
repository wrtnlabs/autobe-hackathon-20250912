import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Retrieve detailed information about a specific notification by its unique
 * identifier.
 *
 * This function fetches the notification from the database ensuring the
 * requesting TPM user has access rights by verifying the user_id.
 *
 * @param props - The properties containing TPM user payload and notification
 *   ID.
 * @param props.tpm - The authenticated Technical Project Manager making the
 *   request.
 * @param props.id - The unique identifier (UUID) of the notification to
 *   retrieve.
 * @returns The detailed notification information conforming to
 *   ITaskManagementNotification.
 * @throws Error if the notification does not exist or the user is unauthorized.
 */
export async function gettaskManagementTpmNotificationsId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementNotification> {
  const { tpm, id } = props;

  const notification =
    await MyGlobal.prisma.task_management_notifications.findUniqueOrThrow({
      where: {
        id,
        user_id: tpm.id,
        deleted_at: null,
      },
    });

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

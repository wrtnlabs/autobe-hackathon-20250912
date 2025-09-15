import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotification";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Update an existing notification record by its unique identifier.
 *
 * This function allows an authorized TPM user to update notification properties
 * such as the read status and read timestamp.
 *
 * @param props - The input properties containing authorization, notification
 *   ID, and update data
 * @param props.tpm - Authenticated TPM user's payload containing their user ID
 * @param props.id - The unique UUID of the notification to be updated
 * @param props.body - The update payload including is_read and read_at fields
 * @returns The updated notification object, with all relevant fields
 * @throws {Error} When the notification does not exist
 * @throws {Error} When the TPM user is not authorized to update the
 *   notification
 */
export async function puttaskManagementTpmNotificationsId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementNotification.IUpdate;
}): Promise<ITaskManagementNotification> {
  const { tpm, id, body } = props;

  const notification =
    await MyGlobal.prisma.task_management_notifications.findUniqueOrThrow({
      where: { id },
    });

  if (notification.user_id !== tpm.id) {
    throw new Error("Unauthorized: You can only update your own notifications");
  }

  const data: {
    is_read?: boolean | undefined;
    read_at?: (string & tags.Format<"date-time">) | null | undefined;
  } = {};

  if (body.is_read !== undefined) {
    data.is_read = body.is_read;
  }

  if (body.read_at !== undefined) {
    data.read_at = body.read_at;
  }

  const updated = await MyGlobal.prisma.task_management_notifications.update({
    where: { id },
    data,
  });

  return {
    id: updated.id,
    user_id: updated.user_id,
    task_id: updated.task_id === null ? null : updated.task_id,
    notification_type: updated.notification_type,
    is_read: updated.is_read,
    read_at: updated.read_at === null ? null : toISOStringSafe(updated.read_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}

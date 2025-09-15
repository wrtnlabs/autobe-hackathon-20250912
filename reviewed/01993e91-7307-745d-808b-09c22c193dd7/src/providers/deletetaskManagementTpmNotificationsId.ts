import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Deletes a task management notification by its unique identifier.
 *
 * This operation permanently removes a notification record associated with the
 * authenticated TPM user from the database.
 *
 * Authorization: Only the owner TPM user of the notification can delete it.
 *
 * @param props - Object containing the authenticated TPM user and notification
 *   ID
 * @param props.tpm - The authenticated TPM user payload
 * @param props.id - The unique ID of the notification to delete
 * @throws {Error} If the notification does not exist
 * @throws {Error} If the TPM user is not authorized to delete the notification
 */
export async function deletetaskManagementTpmNotificationsId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { tpm, id } = props;

  const notification =
    await MyGlobal.prisma.task_management_notifications.findUnique({
      where: { id },
    });

  if (!notification) throw new Error("Notification not found");

  if (notification.user_id !== tpm.id) {
    throw new Error("Unauthorized to delete this notification");
  }

  await MyGlobal.prisma.task_management_notifications.delete({
    where: { id },
  });
}

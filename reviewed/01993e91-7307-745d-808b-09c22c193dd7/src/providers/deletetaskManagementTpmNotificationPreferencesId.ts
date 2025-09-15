import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Delete a notification preference by ID from
 * task_management_notification_preferences
 *
 * This operation permanently deletes a notification preference record
 * identified by its unique ID. Only authorized TPM users may invoke this
 * function.
 *
 * @param props - The properties object containing the TPM user payload and the
 *   ID
 * @param props.tpm - The authenticated TPM user performing the deletion
 * @param props.id - The UUID of the notification preference to delete
 * @returns Void
 * @throws {Error} Throws if the notification preference does not exist
 */
export async function deletetaskManagementTpmNotificationPreferencesId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { tpm, id } = props;

  // Verify the notification preference exists
  await MyGlobal.prisma.task_management_notification_preferences.findUniqueOrThrow(
    {
      where: { id },
    },
  );

  // Perform the hard delete operation
  await MyGlobal.prisma.task_management_notification_preferences.delete({
    where: { id },
  });
}

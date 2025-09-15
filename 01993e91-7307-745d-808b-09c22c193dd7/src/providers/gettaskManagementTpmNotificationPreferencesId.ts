import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Retrieve notification preference detail by ID
 *
 * This operation fetches detailed information about a specific notification
 * preference record by its unique identifier from the
 * task_management_notification_preferences table. Authorized TPM users can view
 * their own notification preferences securely.
 *
 * @param props - Object containing TPM authentication payload and ID of
 *   preference
 * @param props.tpm - The authenticated TPM user making the request
 * @param props.id - Unique identifier (UUID) of the notification preference to
 *   retrieve
 * @returns The notification preference record matching the given ID belonging
 *   to the TPM user
 * @throws {Error} When the notification preference is not found
 * @throws {Error} When requesting TPM user is not authorized to access this
 *   preference
 */
export async function gettaskManagementTpmNotificationPreferencesId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementNotificationPreferences> {
  const { tpm, id } = props;

  // Fetch the notification preference record by ID
  const record =
    await MyGlobal.prisma.task_management_notification_preferences.findUnique({
      where: { id },
    });

  if (record === null) {
    throw new Error("Notification preference not found");
  }

  // Authorization check: ownership verification
  if (record.user_id !== tpm.id) {
    throw new Error("Unauthorized access to this notification preference");
  }

  // Return the notification preference record, converting Date fields properly
  return {
    id: record.id,
    user_id: record.user_id,
    preference_key: record.preference_key,
    enabled: record.enabled,
    delivery_method: record.delivery_method,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}

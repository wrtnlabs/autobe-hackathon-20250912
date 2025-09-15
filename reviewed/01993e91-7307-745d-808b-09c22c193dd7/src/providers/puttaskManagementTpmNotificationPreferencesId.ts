import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Update a notification preference by its unique ID.
 *
 * This endpoint allows a TPM to update their notification preferences including
 * preference key, enabled status, and delivery method.
 *
 * Authorization is enforced by ensuring the TPM is the owner of the preference.
 *
 * @param props - Object containing TPM authentication, preference ID, and
 *   update data
 * @param props.tpm - Authenticated TPM user
 * @param props.id - UUID of the notification preference to update
 * @param props.body - Update data including preference key, enabled flag, and
 *   delivery method
 * @returns The updated notification preference record
 * @throws {Error} When the notification preference is not found
 * @throws {Error} When the TPM user is not authorized to update this preference
 */
export async function puttaskManagementTpmNotificationPreferencesId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementNotificationPreferences.IUpdate;
}): Promise<ITaskManagementNotificationPreferences> {
  const { tpm, id, body } = props;

  // Fetch existing notification preference record
  const existing =
    await MyGlobal.prisma.task_management_notification_preferences.findUnique({
      where: { id },
    });

  if (!existing) {
    throw new Error("Notification preference not found");
  }

  // Authorization check: Only owner can update
  if (existing.user_id !== tpm.id) {
    throw new Error("Unauthorized to update this notification preference");
  }

  // Prepare updated timestamp
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Update the preference record with provided fields
  const updated =
    await MyGlobal.prisma.task_management_notification_preferences.update({
      where: { id },
      data: {
        preference_key: body.preference_key ?? undefined,
        enabled: body.enabled ?? undefined,
        delivery_method: body.delivery_method ?? undefined,
        updated_at: now,
      },
    });

  // Return updated record with all date fields converted properly
  return {
    id: updated.id,
    user_id: updated.user_id,
    preference_key: updated.preference_key,
    enabled: updated.enabled,
    delivery_method: updated.delivery_method,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

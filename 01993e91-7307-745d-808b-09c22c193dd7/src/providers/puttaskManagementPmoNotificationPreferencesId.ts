import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Update a notification preference by its unique ID.
 *
 * Allows a Project Management Officer (PMO) to update their own notification
 * preferences, including preference key, enabled status, and delivery method.
 *
 * Authorization: The PMO user can only update preferences they own.
 *
 * @param props - Object containing the authenticated PMO payload, the
 *   notification preference ID, and the update body.
 * @param props.pmo - The authenticated PMO user payload.
 * @param props.id - The UUID of the notification preference to update.
 * @param props.body - Partial update data for the preference.
 * @returns The updated notification preference record.
 * @throws {Error} If the notification preference does not exist.
 * @throws {Error} If the PMO user is not authorized to update this preference.
 */
export async function puttaskManagementPmoNotificationPreferencesId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementNotificationPreferences.IUpdate;
}): Promise<ITaskManagementNotificationPreferences> {
  const { pmo, id, body } = props;

  const preference =
    await MyGlobal.prisma.task_management_notification_preferences.findUnique({
      where: { id },
    });

  if (!preference) {
    throw new Error("Notification preference not found");
  }

  if (preference.user_id !== pmo.id) {
    throw new Error("Unauthorized to update this notification preference");
  }

  const updated =
    await MyGlobal.prisma.task_management_notification_preferences.update({
      where: { id },
      data: {
        preference_key: body.preference_key ?? undefined,
        enabled: body.enabled ?? undefined,
        delivery_method: body.delivery_method ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

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

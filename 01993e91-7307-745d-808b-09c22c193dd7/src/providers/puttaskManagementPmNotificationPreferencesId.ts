import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Update a notification preference by its unique ID.
 *
 * This endpoint allows a Project Manager (pm) to update their own notification
 * preference record, including the preference key, the enabled flag, and the
 * delivery method.
 *
 * Authorization
 *
 * - Only the owning pm user can update their notification preference.
 *
 * Validation
 *
 * - Enforces allowed preference keys: 'assignment', 'status_change', 'comment'
 * - Enforces allowed delivery methods: 'email', 'push', 'sms'
 *
 * @param props - Object containing pm payload, id of the preference, and update
 *   body
 * @param props.pm - The authenticated Project Manager making the request
 * @param props.id - UUID of the notification preference to update
 * @param props.body - Partial update data for the notification preference
 * @returns The updated notification preference record with all fields
 * @throws {Error} When the record is not found
 * @throws {Error} When the pm does not own the preference
 * @throws {Error} When invalid preference_key or delivery_method is provided
 */
export async function puttaskManagementPmNotificationPreferencesId(props: {
  pm: PmPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementNotificationPreferences.IUpdate;
}): Promise<ITaskManagementNotificationPreferences> {
  const { pm, id, body } = props;

  const existing =
    await MyGlobal.prisma.task_management_notification_preferences.findUnique({
      where: { id },
    });

  if (!existing) throw new Error("Notification preference not found");

  if (existing.user_id !== pm.id) {
    throw new Error("Unauthorized to update this preference");
  }

  const allowedPreferenceKeys = ["assignment", "status_change", "comment"];
  const allowedDeliveryMethods = ["email", "push", "sms"];

  if (body.preference_key !== undefined && body.preference_key !== null) {
    if (!allowedPreferenceKeys.includes(body.preference_key)) {
      throw new Error("Invalid preference_key provided");
    }
  }

  if (body.delivery_method !== undefined) {
    if (!allowedDeliveryMethods.includes(body.delivery_method)) {
      throw new Error("Invalid delivery_method provided");
    }
  }

  const now = toISOStringSafe(new Date());

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

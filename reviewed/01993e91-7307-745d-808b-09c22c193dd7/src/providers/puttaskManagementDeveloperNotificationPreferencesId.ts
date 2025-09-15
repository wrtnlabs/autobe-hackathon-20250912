import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Update a notification preference by its unique ID.
 *
 * This endpoint allows a developer to update their own notification preferences
 * including preference key, enabled status, and delivery method. It verifies
 * that the authenticated developer owns the preference record before updating.
 *
 * @param props - Object containing developer authentication, preference ID, and
 *   update body
 * @param props.developer - Authenticated developer payload with ID and type
 * @param props.id - Unique identifier of the notification preference record
 * @param props.body - Partial update object for notification preference fields
 * @returns The updated notification preference record
 * @throws {Error} When the notification preference is not found or unauthorized
 *   access
 */
export async function puttaskManagementDeveloperNotificationPreferencesId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementNotificationPreferences.IUpdate;
}): Promise<ITaskManagementNotificationPreferences> {
  const { developer, id, body } = props;

  const preference =
    await MyGlobal.prisma.task_management_notification_preferences.findUniqueOrThrow(
      {
        where: { id },
        select: { id: true, user_id: true },
      },
    );

  if (preference.user_id !== developer.id) {
    throw new Error("Unauthorized: You can only update your own preferences");
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
